import express from 'express';
import {
  onGetBets, onUpdateBetById,
} from '../controllers/game';

const router = express.Router();

router
  .get('/:id', onGetBets)
  .put('/', onUpdateBetById);

export default router;
