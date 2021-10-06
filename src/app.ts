import express from 'express';
import jwt from 'jsonwebtoken';
import { createServer, Server as HttpServer } from 'http';
import socketio, { Server as IOServer, Socket } from 'socket.io';
import cors from 'cors';
import { findUserSocketByUserId, leaveRoom, reJoinRoom } from './utils/usersSocket';
import { decodeMiddleware } from './middlewares/jwt';
import { UserModel } from './models/user';
import { createUserRouter } from './routes/index';
import { createRoomRouter } from './routes/room';
import gameRouter from './routes/game';
import downloadRouter from './routes/dwnld';
import { getDelUserRouter } from './routes/user';
import { createMessageRouter } from './routes/message';
import { Bet } from './types';
import { connectDb } from './config/db';
import { Event } from './constants';
import { GameModel } from './models/game';
import { RoomModel } from './models/room';
import { config } from './config/db.config';
import cloudinary from './utils/cloudinary';
import {
  addToKick, countVotes, isKick, removeUserFromKickArray,
} from './utils/voteKickSocket';
import { discon } from './utils/disconnectInterval';

const PORT: string | number = process.env.PORT || 4000;
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cors({ credentials: false, origin: '*' }));
const server: HttpServer = createServer(app);
let disconnectInterval: NodeJS.Timeout;
const io: IOServer = (socketio as any)(server, { cors: { credentials: false } });

connectDb().then(async () => {
  io.on(Event.CONNECT, (socket: Socket) => {
    clearInterval(disconnectInterval);

    if (socket.handshake.query.token != null) {
      jwt.verify(socket.handshake.query.token as string, config.API_KEY, async (err, decoded) => {
        if (decoded?.userId) { reJoinRoom(socket.id, decoded?.userId); }
        const room = await RoomModel.getRoomByUser(decoded?.userId);
        if (room) socket.join(room?.id);
      });
    }
    socket.emit('clientConnected', socket.id);

    socket.on(Event.BET, async (bet: Bet) => {
      try {
        const doneBet = await GameModel.setAndUpdateBet(bet);
        io.to(bet.roomId).emit(Event.ON_BET, doneBet);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.VOTE_START, async ({ roomId, player, initiator }) => {
      try {
        const initUser = await UserModel.getUserById(initiator);
        const userForKick = await UserModel.getUserById(player);
        const room = await RoomModel.getRoomByUser(initiator);
        io.to(roomId).emit(Event.ON_VOTE_START, { userForKick, initUser, startUsersNumber: room.users.length });
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.VOTE_END, async ({ vote, userForKickId, startUsersNumber }) => {
      try {
        setTimeout(() => removeUserFromKickArray(userForKickId), 15000);
        addToKick(vote, userForKickId);
        const votes = countVotes(userForKickId);
        if (votes === startUsersNumber - 1) {
          const room = await RoomModel.getRoomByUser(userForKickId);
          const voteResult = isKick(userForKickId);
          if (voteResult) {
            const user = await UserModel.deleteUserById(userForKickId);
            await RoomModel.deleteUserFromRoomById(userForKickId);
            if (user.cloudinary_id) await cloudinary.uploader.destroy(user.cloudinary_id);
            const users = await RoomModel.getRoomUsers(room.id);
            const socketIDs = leaveRoom(userForKickId);
            (io.sockets.sockets.get(socketIDs[0]))?.emit(Event.KICK);
            await io.to(room.id).emit(Event.USER_DELETE, users);
          }
        }
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.PLAY, async (roomId) => {
      try {
        io.to(roomId).emit(Event.ON_PLAY, { gameStatus: 'started', roomId });
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.RUN_ROUND, async ({ roomId, issueId }) => {
      try {
        await GameModel.deleteBetsOnRestart(issueId);
        io.to(roomId).emit(Event.ON_RUN_ROUND, { isRoundStarted: true });
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.STOP_ROUND, async (roomId) => {
      try {
        io.to(roomId).emit(Event.ON_STOP_ROUND);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.FINISH_GAME, async (roomId) => {
      try {
        RoomModel.updateGameStatus(roomId, 'finished');
        io.to(roomId).emit(Event.ON_FINISH_GAME, { gameStatus: 'finished' });
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.UN_BLUR, async ({ userId }) => {
      try {
        const userSocketId = findUserSocketByUserId(userId);
        io.sockets.sockets.get(userSocketId)?.emit(Event.ADMIT);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.CHANGE_OBSERVER_STATUS, async ({ userId, status }) => {
      try {
        await UserModel.updateObserverStatus(userId, status);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.SET_ACTIVE_ISSUE, async ({ roomId, issueId }) => {
      try {
        io.to(roomId).emit(Event.ON_SET_ACTIVE_ISSUE, issueId);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.DISCONNECT, async () => {
      try {
        disconnectInterval = setTimeout(discon, 5000, socket.id, io);
      } catch (err) {
        console.log(err);
      }
    });
  });

  const PREFIX = '/api';
  app.use(`${PREFIX}`, createUserRouter(io));
  app.use(decodeMiddleware);
  app.use(`${PREFIX}/game`, gameRouter);
  app.use(`${PREFIX}/download`, downloadRouter);
  app.use(`${PREFIX}/room`, createRoomRouter(io));
  app.use(`${PREFIX}/users`, getDelUserRouter(io));
  app.use(`${PREFIX}/messages`, createMessageRouter(io));
  app.use('*', (req, res) => res.status(404).json({
    message: "API endpoint doesn't exist",
  }));

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
