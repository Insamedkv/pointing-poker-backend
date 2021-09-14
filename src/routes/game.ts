import express from 'express';
import {
  onGetBets, onUpdateBetById,
} from '../controllers/game';

const router = express.Router();

router
  .post('/', onGetBets)
  .put('/', onUpdateBetById);

export default router;
