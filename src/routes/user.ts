import express from 'express';
import { onDeleteUserById, onGetUserById } from '../controllers/user';

const router = express.Router();

router
  .get('/:id', onGetUserById)
  .delete('/:id', onDeleteUserById);

export default router;
