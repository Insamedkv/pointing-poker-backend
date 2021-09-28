import express from 'express';
import jwt from 'jsonwebtoken';
import { createServer, Server as HttpServer } from 'http';
import socketio, { Server as IOServer, Socket } from 'socket.io';
import cors from 'cors';
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
import { joinRoom, reJoinRoom, UserSocket } from './utils/usersSocket';
import { MessageModel } from './models/message';
import { Event } from './constants';
import { GameModel } from './models/game';
import { Issue, RoomModel, Rules } from './models/room';
import { onGetRoomUsers } from './controllers/room';
import { config } from './config/db.config';

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
    if (socket.handshake.query.token != null) {
      console.log('token', socket.handshake.query.token);
      jwt.verify(socket.handshake.query.token as string, config.API_KEY, async (err, decoded) => {
        if (decoded?.userId) { reJoinRoom(socket.id, decoded?.userId); }
        const room = await RoomModel.getRoomByUser(decoded?.userId);
        if (room) socket.join(room?.id);
      });
    }

    console.log('Client connected...', socket.id);
    socket.emit('clientConnected', socket.id);

    socket.on(Event.BET, async (bet: Bet) => {
      console.log('Bet has been emitted');
      console.log(`[message]: ${JSON.stringify(bet)}`);
      try {
        await GameModel.setBet(bet);
        const userDetails = await UserModel.getUserById((bet.userId)!);
        io.to(bet.roomId).emit(Event.BET, `${userDetails.firstName} set his bet `);
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

    socket.on(Event.VOTE_END, async ({ roomId, vote }) => {
      console.log('Vote has been ended');
      console.log(`[message]: ${JSON.stringify(roomId)}`);
      try {
        io.to(roomId).emit(Event.VOTE_END, vote);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.VOTE_RESULT, async ({ roomId, vote, userForKickId }) => {
      console.log('Vote results');
      console.log(`[message]: ${JSON.stringify(roomId)}`);
      try {
        const roomUsers = await RoomModel.getRoomUsers;
        const numberOfUsersWithoutMaster = roomUsers.length - 1;
        if (Math.floor(numberOfUsersWithoutMaster / 2 + 1) < vote) {
          io.to(roomId).emit(Event.VOTE_RESULT, 'Kick rejected');
        }
        const kickedUserInfo = await UserModel.deleteUserById(userForKickId);
        io.to(roomId).emit(Event.VOTE_RESULT, `${kickedUserInfo.name} kicked from room`);
      } catch (err) {
        console.log(err);
      }
    });

    // socket.on(Event.PLAY, async () => {
    //   console.log('Title has been updated');
    //   console.log(`[message]: ${JSON.stringify()}`);
    //   try {
    //     const newTitle = await RoomModel.updateRoomTitle();
    //     io.to().emit(Event.TITLE_UPDATE, newTitle);
    //   } catch (err) {
    //     console.log(err);
    //   }
    // });
    // setRules
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
