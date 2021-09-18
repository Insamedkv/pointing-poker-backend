import express from 'express';
import { onGetMessages } from '../controllers/message';

const router = express.Router();

router.post('/', onGetMessages);

export default router;
