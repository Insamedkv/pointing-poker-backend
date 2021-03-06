import express from 'express';
import { Server } from 'socket.io';
import {
  onGetRoomIssues,
  onUpdateRoomIssue,
  onUpdateRoomTitle,
  onLeaveRoom,
  onSetRoomRules,
  onDeleteRoomIssue,
  onDeleteRoomById,
  onCreateRoomIssue,
  onGetRoomUsers,
  onGetRoomCreator,
  onUpdateGameStatus,
} from '../controllers/room';

export function createRoomRouter(ioServer: Server) {
  const router = express.Router();
  return router
    .get('/:id/creator', onGetRoomCreator)
    .get('/:id/users', onGetRoomUsers)
    .get('/:id/issue', onGetRoomIssues)
    .post('/:id/issue', onCreateRoomIssue(ioServer))
    .put('/:roomid/rules', onSetRoomRules)
    .put('/:roomid/gamestatus', onUpdateGameStatus)
    .post('/:id/leave', onLeaveRoom(ioServer))
    .put('/:roomid/issue/:id', onUpdateRoomIssue(ioServer))
    .put('/:id', onUpdateRoomTitle(ioServer))
    .delete('/:roomid/issue/:id', onDeleteRoomIssue(ioServer))
    .delete('/:id', onDeleteRoomById(ioServer));
}
