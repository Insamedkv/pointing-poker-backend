import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import socketio, { Server as IOServer, Socket } from 'socket.io';
import cors from 'cors';
import { decodeMiddleware } from './middlewares/jwt';
import { UserModel } from './models/user';
import indexRouter from './routes/index';
import roomRouter from './routes/room';
import gameRouter from './routes/game';
import userRouter from './routes/user';
import messageRouter from './routes/message';
import { Bet, ChatMessage, SocketIssue } from './types';
import { connectDb } from './config/db';
import { joinRoom } from './utils/usersSocket';
import { MessageModel } from './models/message';
import { Event } from './constants';
import { GameModel } from './models/game';
import { RoomModel } from './models/room';

const PORT: string | number = process.env.PORT || 4000;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ credentials: false }));
const server: HttpServer = createServer(app);
const io: IOServer = (socketio as any)(server, { cors: { credentials: false } });

app.set('io', io);

connectDb().then(async () => {
  io.on(Event.CONNECT, (socket: Socket) => {
    console.log('Client connected..');
    socket.on(Event.JOIN, async (userRoom) => {
      console.log('User joined room');
      console.log(`[user]: ${JSON.stringify(userRoom)}`);
      joinRoom(socket.id, userRoom.userId, userRoom.roomId);
      socket.join(userRoom.roomId);
      try {
        const userDetails = await UserModel.getUserById(userRoom.userId);
        socket.to(userRoom.roomId).emit(Event.JOIN, { userDetails, joinedRoom: userRoom.roomId });
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.MESSAGE, async (message: ChatMessage) => {
      console.log('Message has been emitted');
      console.log(`[message]: ${JSON.stringify(message)}`);
      try {
        const newMsg = await MessageModel.createMsg(message);
        io.to(message.roomId).emit(Event.MESSAGE, { newMsg });
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.BET, async (bet: Bet) => {
      console.log('Bet has been emitted');
      console.log(`[message]: ${JSON.stringify(bet)}`);
      try {
        await GameModel.setBet(bet);
        const userDetails = await UserModel.getUserById((bet.userId)!);
        io.to(bet.roomId).emit(Event.MESSAGE, `${userDetails.firstName} set his bet `);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.ISSUE_CREATE, async (i: SocketIssue) => {
      console.log('Issue has been created');
      console.log(`[message]: ${JSON.stringify(i)}`);
      try {
        const issue = await RoomModel.createRoomIssue(i.issueId, i.issue);
        io.to(i.roomId).emit(Event.ISSUE_CREATE, issue);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.ISSUE_UPDATE, async (i: SocketIssue) => {
      console.log('Issue has been updated');
      console.log(`[message]: ${JSON.stringify(i)}`);
      try {
        const issue = await RoomModel.updateRoomIssueById(i.issueId, i.issue);
        io.to(i.roomId).emit(Event.ISSUE_UPDATE, issue);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on(Event.TITLE_UPDATE, async (roomTitle: string, roomId: string) => {
      console.log('Title has been updated');
      console.log(`[message]: ${JSON.stringify(roomTitle)}`);
      try {
        const newTitle = await RoomModel.updateRoomTitle(roomTitle, roomId);
        io.to(roomId).emit(Event.TITLE_UPDATE, newTitle);
      } catch (err) {
        console.log(err);
      }
    });
  });

  const PREFIX = '/api';
  app.use(`${PREFIX}`, indexRouter);
  app.use(decodeMiddleware);
  app.use(`${PREFIX}/game`, gameRouter);
  app.use(`${PREFIX}/room`, roomRouter);
  app.use(`${PREFIX}/users`, userRouter);
  app.use(`${PREFIX}/messages`, messageRouter);
  app.use('*', (req, res) => res.status(404).json({
    message: "API endpoint doesn't exist",
  }));

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
