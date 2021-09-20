import express from 'express';
import { Server } from 'socket.io';
import { onCreateMessage, onGetMessages } from '../controllers/message';

export function createMessageRouter(ioServer: Server) {
  const router = express.Router();
  return router
    .get('/', onGetMessages)
    .post('/', onCreateMessage(ioServer));
}
