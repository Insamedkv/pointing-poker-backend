import express from 'express';
import {
  downloadResultsInRoom,
} from '../controllers/dwnld';

const router = express.Router();

router
  .get('/:id', downloadResultsInRoom);

export default router;
