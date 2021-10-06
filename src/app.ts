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
import { addToKick, isKick } from './utils/voteKickSocket';
import { discon } from './utils/disconnectInterval';

const PORT: string | number = process.env.PORT || 4000;
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cors({ credentials: false, origin: '*' }));
const server: HttpServer = createServer(app);
const io: IOServer = (socketio as any)(server, { cors: { credentials: false } });

connectDb().then(async () => {
  io.on(Event.CONNECT, (socket: Socket) => {
    let disconnectInterval;

    if (socket.handshake.query.token != null) {
      clearInterval(disconnectInterval);
      jwt.verify(socket.handshake.query.token as string, config.API_KEY, async (err, decoded) => {
        console.log('SOCKET', socket.id);
        if (decoded?.userId) { reJoinRoom(socket.id, decoded?.userId); }
        const room = await RoomModel.getRoomByUser(decoded?.userId);
        if (room) socket.join(room?.id);
      });
    }

    console.log('Client connected...', socket.id);
    socket.emit('clientConnected', socket.id);
    // const socketId = socket.id;

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
        io.to(roomId).emit(Event.ON_VOTE_START, { userForKick, initUser });
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.VOTE_END, async ({ vote, userForKickId }) => {
      try {
        addToKick(vote, userForKickId);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.VOTE_RESULT, async (userForKickId) => {
      try {
        const room = RoomModel.getRoomByUser(userForKickId);
        const voteResult = isKick(userForKickId);
        if (voteResult === false) {
          io.to(room.id).emit(Event.VOTE_RESULT, 'Kick rejected');
        } else {
          const user = await UserModel.deleteUserById(userForKickId);
          await RoomModel.deleteUserFromRoomById(userForKickId);
          if (user.cloudinary_id) await cloudinary.uploader.destroy(user.cloudinary_id);
          // await user.remove();
          const users = await RoomModel.getRoomUsers(room.id);
          const socketIDs = leaveRoom(userForKickId);
          (io.sockets.sockets.get(socketIDs[0]))?.emit(Event.KICK);
          await io.to(room.id).emit(Event.USER_DELETE, users);
          io.to(room.id).emit(Event.VOTE_RESULT, `${user.firstName} kicked from room`);
        }
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.PLAY, async (roomId) => {
      try {
        io.to(roomId).emit(Event.ON_PLAY, { isGameStarted: true, roomId });
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
        io.to(roomId).emit(Event.ON_FINISH_GAME);
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
      console.log('Status changed');
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
      console.log('Client disconnected');
      try {
        disconnectInterval = setTimeout(discon, 3000, socket.id, io);
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
