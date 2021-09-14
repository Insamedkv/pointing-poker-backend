import express from 'express';
import { onCreateUser } from '../controllers/user';
import { upload } from '../utils/multer';

const router = express.Router();

router
  .post('/signup', upload.single('image'), onCreateUser);

export default router;
