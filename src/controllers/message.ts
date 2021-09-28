import { Response } from 'express';
import { Server } from 'socket.io';
import { MessageModel } from '../models/message';
import { RoomModel } from '../models/room';
import { Event } from '../constants';
import { ChatMessage } from '../types';
import { UserModel } from '../models/user';

export const onGetMessages = async (req: any, res: Response) => {
  try {
    const room = RoomModel.getRoomByUser(req.userId);
    const messages = await MessageModel.getMsgs(room.id);
    return res.status(200).json(messages);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};

export const onCreateMessage = (ioServer: Server) => async (req: any, res: Response) => {
  try {
    const room = await RoomModel.getRoomByUser(req.userId);
    const user = await UserModel.getUserById(req.userId);
    const message: ChatMessage = {
      content: req.body.message,
      roomId: room.id,
      userId: req.userId,
    };
    const messageCreatorInfo = {
      content: req.body.message,
      roomId: room.id,
      user,
    };
    console.log(message);
    await MessageModel.createMsg(message);
    ioServer.to(room.id).emit(Event.MESSAGE, messageCreatorInfo);
    return res.status(201).end();
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};
