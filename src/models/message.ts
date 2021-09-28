import { Model, Schema, model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { User, UserModel } from './user';
import { ChatMessage } from '../types';

export interface Msg {
  content: string;
  user: string | User;
  roomId: string;
}

export interface MessageModelStaticMethods extends Model<Msg> {
  createMsg(chatMessage: ChatMessage): Msg;
  getMsgs(roomId: string): Msg[];
}

const messageSchema = new Schema<Msg, MessageModelStaticMethods>(
  {
    content: {
      type: String,
      required: true,
    },
    user: { type: Object, required: true },
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
    content: mes.content, user, roomId: mes.roomId,
  });
  return message;
};

messageSchema.statics.getMsgs = async function (roomId: string) {
  const messsages = await this.find({ roomId });
  return messsages;
};

export const MessageModel = model<Msg, MessageModelStaticMethods>('messageModel', messageSchema);
