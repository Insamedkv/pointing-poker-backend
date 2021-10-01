import express from 'express';
import jwt from 'jsonwebtoken';
import { createServer, Server as HttpServer } from 'http';
import socketio, { Server as IOServer, Socket } from 'socket.io';
import cors from 'cors';
import {
  disconnect, leaveRoom, reJoinRoom, UserSocket,
} from './utils/usersSocket';
import { decodeMiddleware } from './middlewares/jwt';
import { UserModel } from './models/user';
import { createUserRouter } from './routes/index';
import { createRoomRouter } from './routes/room';
import gameRouter from './routes/game';
import { getDelUserRouter } from './routes/user';
import { createMessageRouter } from './routes/message';
import {
  Bet, ChatMessage, SocketIssueCreate, SocketIssueDelete, SocketIssueUpdate,
} from './types';
import { connectDb } from './config/db';

import { MessageModel } from './models/message';
import { Event } from './constants';
import { GameModel } from './models/game';
import { Issue, RoomModel, Rules } from './models/room';
import { onGetRoomUsers } from './controllers/room';
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
  // io.use((socket: any, next) => {
  //   if (socket.handshake.query && socket.handshake.query.token) {
  //     jwt.verify(socket.handshake.query.token as string, config.API_KEY, async (err, decoded) => {
  //       if (err) return next(new Error('Authentication error'));
  //       console.log('deco', decoded!.userId);
  //       reJoinRoom(socket.id, decoded!.userId);
  //       const room = await RoomModel.getRoomByUser(decoded!.userId);
  //       console.log('room', room?.id);
  //       if (room) socket.join(room?.id);
  //       socket.decoded = decoded;
  //       next();
  //     });
  //   } else {
  //     next(new Error('Authentication error'));
  //   }
  // });
  io.on(Event.CONNECT, (socket: Socket) => {
    let disconnectInterval;
    clearInterval(disconnectInterval);
    if (socket.handshake.query.token != null) {
      jwt.verify(socket.handshake.query.token as string, config.API_KEY, async (err, decoded) => {
        if (decoded?.userId) { reJoinRoom(socket.id, decoded?.userId); }
        const room = await RoomModel.getRoomByUser(decoded?.userId);
        if (room) socket.join(room?.id);
      });
    }

    console.log('Client connected...', socket.id);
    socket.emit('clientConnected', socket.id);
    const socketId = socket.id;

    socket.on(Event.BET, async (bet: Bet) => {
      console.log('Bet has been emitted');
      console.log(`[message]: ${JSON.stringify(bet)}`);
      try {
        await GameModel.setBet(bet);
        // const userDetails = await UserModel.getUserById((bet.userId)!);
        // io.to(bet.roomId).emit(Event.BET, `${userDetails.firstName} set his bet `);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.VOTE_START, async (roomId: string) => {
      console.log('Vote has been started');
      console.log(`[message]: ${JSON.stringify(roomId)}`);
      try {
        io.to(roomId).emit(Event.VOTE_START, true);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.VOTE_END, async ({ vote, userForKickId }) => {
      console.log('Vote has been ended');
      console.log(`[message]: ${JSON.stringify(userForKickId)}`);
      try {
        addToKick(vote, userForKickId);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.VOTE_RESULT, async (userForKickId) => {
      console.log('Vote results');
      console.log(`[message]: ${JSON.stringify(userForKickId)}`);
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
      console.log('Game started');
      try {
        io.to(roomId).emit(Event.ON_PLAY, { isGameStarted: true, roomId });
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.RUN_ROUND, async (roomId) => {
      console.log('Round started');
      try {
        io.to(roomId).emit(Event.ON_RUN_ROUND, { isRoundStarted: true });
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.DISCONNECT, async () => {
      console.log('Client disconnected');
      try {
        disconnectInterval = setTimeout(discon, 3000, socketId, io);
      } catch (err) {
        console.log(err);
      }
    });
  });

  const PREFIX = '/api';
  app.use(`${PREFIX}`, createUserRouter(io));
  app.use(decodeMiddleware);
  app.use(`${PREFIX}/game`, gameRouter);
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
