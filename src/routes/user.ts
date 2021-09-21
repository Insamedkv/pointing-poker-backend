import express from 'express';
import { Server } from 'socket.io';
import { onDeleteUserById, onGetUserById } from '../controllers/user';

export function getDelUserRouter(ioServer: Server) {
  const router = express.Router();
  return router
    .get('/:id', onGetUserById)
    .delete('/:id/:socket', onDeleteUserById(ioServer));
}
