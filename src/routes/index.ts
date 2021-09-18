import express from 'express';
import { onCreateUser } from '../controllers/user';

const router = express.Router();

router
  .post('/signup', onCreateUser);

export default router;
