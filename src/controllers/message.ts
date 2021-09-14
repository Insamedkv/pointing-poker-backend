import { Request, Response } from 'express';
import { MessageModel } from '../models/message';

export const onGetMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.body;
    const messages = await MessageModel.getMsgs(roomId);
    return res.status(200).json(messages);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};
