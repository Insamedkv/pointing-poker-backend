import express from 'express';
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
} from '../controllers/room';

const router = express.Router();

router
  .get('/:id', onGetRoomUsers)
  .get('/:id/issue', onGetRoomIssues)
  .post('/:id/issue', onCreateRoomIssue)
  .post('/:id/', onSetRoomRules)
  .post('/:id/leave', onLeaveRoom)
  .put('/:id/issue/:id', onUpdateRoomIssue)
  .put('/:id/', onUpdateRoomTitle)
  .delete('/:id/issue/:id', onDeleteRoomIssue)
  .delete('/:id', onDeleteRoomById);

export default router;