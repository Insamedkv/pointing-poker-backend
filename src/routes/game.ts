import express from 'express';
import {
  onGetBets,
} from '../controllers/game';

const router = express.Router();

router
  .get('/:id', onGetBets);

export default router;
