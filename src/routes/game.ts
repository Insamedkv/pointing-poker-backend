import express from 'express';
import {
  onGetBets, onUpdateBetById,
} from '../controllers/game';

const router = express.Router();

router
  .get('/', onGetBets)
  .put('/', onUpdateBetById);

export default router;
