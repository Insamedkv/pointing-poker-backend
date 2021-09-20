import express from 'express';
import { Server } from 'socket.io';
import { onCheckRoomCreated } from '../controllers/room';
import { onCreateUser } from '../controllers/user';

export function createUserRouter(ioServer: Server) {
  const router = express.Router();
  return router
    .post('/signup', onCreateUser(ioServer))
    .get('/created/:id', onCheckRoomCreated);
}
