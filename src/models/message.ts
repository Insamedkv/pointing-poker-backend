import { Model, Schema, model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { UserModel } from './user';
import { ChatMessage } from '../types';

export interface Msg {
  content: string;
  userId: string;
  roomId: string;
}

export interface MessageModelStaticMethods extends Model<Msg> {
  createMsg(chatMessage: ChatMessage): Msg;
  getMsgs(roomId: string): any;
}

const messageSchema = new Schema<Msg, MessageModelStaticMethods>(
  {
    content: {
      type: String,
      required: true,
    },
    userId: { type: String, required: true },
    roomId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

messageSchema.statics.createMsg = async function (mes: ChatMessage) {
  const user = await UserModel.getUserById(mes.userId!);
  if (!user) throw new Error('User not found');
  const message = await this.create({
    content: mes.content, userId: user.id, roomId: mes.roomId,
  });
  return message;
};

messageSchema.statics.getMsgs = async function (roomId: string) {
  return this.find({ roomId });
};

export const MessageModel = model<Msg, MessageModelStaticMethods>('messageModel', messageSchema);
