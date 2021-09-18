import express from 'express';
import { onCheckRoomCreated } from '../controllers/room';
import { onCreateUser } from '../controllers/user';

const router = express.Router();

router
  .post('/signup', onCreateUser)
  .get('/created/:id', onCheckRoomCreated);

export default router;
