import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import socketio, { Server as IOServer, Socket } from 'socket.io';
import cors from 'cors';
import { decodeMiddleware } from './middlewares/jwt';
import { UserModel } from './models/user';
import { createUserRouter } from './routes/index';
import roomRouter from './routes/room';
import gameRouter from './routes/game';
import { getDelUserRouter } from './routes/user';
import { createMessageRouter } from './routes/message';
import {
  Bet, ChatMessage, SocketIssueCreate, SocketIssueUpdate,
} from './types';
import { connectDb } from './config/db';
import { joinRoom, UserSocket } from './utils/usersSocket';
import { MessageModel } from './models/message';
import { Event } from './constants';
import { GameModel } from './models/game';
import { Issue, RoomModel, Rules } from './models/room';
import { onGetRoomUsers } from './controllers/room';

const PORT: string | number = process.env.PORT || 4000;
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cors({ credentials: false, origin: '*' }));
const server: HttpServer = createServer(app);
const io: IOServer = (socketio as any)(server, { cors: { credentials: false } });

connectDb().then(async () => {
  io.on(Event.CONNECT, (socket: Socket) => {
    console.log('Client connected...', socket.id);
    socket.emit('clientConnected', socket.id);

    socket.on(Event.JOIN, async (roomId: string) => {
      socket.join(roomId);
      const response = await RoomModel.getRoomUsers(roomId);
      socket.to(roomId).emit(Event.ONJOIN, response);
    });

    // socket.on(Event.JOIN, async (userRoom: UserSocket) => {
    //   console.log('User joined room');
    //   console.log(`[user]: ${JSON.stringify(userRoom)}`);
    //   joinRoom(socket.id, userRoom.userId, userRoom.roomId);
    //   socket.join(userRoom.roomId);
    //   try {
    //     const userDetails = await UserModel.getUserById(userRoom.userId);
    //     socket.to(userRoom.roomId).emit(Event.JOIN, { userDetails, joinedRoom: userRoom.roomId });
    //   } catch (err) {
    //     console.log(err);
    //   }
    // });

    // socket.on(Event.MESSAGE, async (message: ChatMessage) => {
    //   console.log('Message has been emitted');
    //   console.log(`[message]: ${JSON.stringify(message)}`);
    //   try {
    //     const newMsg = await MessageModel.createMsg(message);
    //     io.to(message.roomId).emit(Event.MESSAGE, { newMsg });
    //   } catch (err) {
    //     console.log(err);
    //   }
    // });

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

    socket.on(Event.ISSUE_CREATE, async (i: SocketIssueCreate) => {
      console.log('Issue has been created');
      console.log(`[message]: ${JSON.stringify(i.issue)}`);
      try {
        await RoomModel.createRoomIssue(i.roomId, i.issue);
        const issueList = await RoomModel.getRoomIssues(i.roomId);
        console.log('get from db:', issueList);
        io.to(i.roomId).emit(Event.ON_ISSUE_CREATE, issueList);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.ISSUE_UPDATE, async (i: SocketIssueUpdate) => {
      console.log('Issue has been updated');
      console.log(`[message]: ${JSON.stringify(i)}`);
      try {
        const issue = await RoomModel.updateRoomIssueById(i.issueId!, i.issue);
        io.to(i.roomId).emit(Event.ISSUE_UPDATE, issue);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.TITLE_UPDATE, async ({ roomTitle, roomId }) => {
      console.log('Title has been updated');
      console.log(`[message]: ${JSON.stringify(roomTitle)}`);
      try {
        const newTitle = await RoomModel.updateRoomTitle(roomTitle, roomId);
        io.to(roomId).emit(Event.TITLE_UPDATE, newTitle);
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

    socket.on(Event.SET_RULES, async (roomId: string, rules: Rules) => {
      console.log('Vote has been ended');
      console.log(`[message]: ${JSON.stringify(roomId)}`);
      try {
        const setRules = await RoomModel.setRoomRules(roomId, rules);
        io.to(roomId).emit(Event.SET_RULES, setRules);
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
  app.use(`${PREFIX}/room`, roomRouter);
  app.use(`${PREFIX}/users`, getDelUserRouter(io));
  app.use(`${PREFIX}/messages`, createMessageRouter(io));
  app.use('*', (req, res) => res.status(404).json({
    message: "API endpoint doesn't exist",
  }));

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
