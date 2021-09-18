import { Model, Schema, model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { UserModel } from './user';
import { Bet } from '../types';

export interface GameBet {
  content: string;
  userId: ObjectId;
  roomId: string;
  issueId: string;
}

export interface GameModelStaticMethods extends Model<GameBet> {
  setBet(bet: Bet): GameBet;
  updateBetById(betId: string, content: string): GameBet;
  getBets(roomId: string): GameBet[];
}

const gameSchema = new Schema<GameBet, GameModelStaticMethods>(
  {
    content: {
      type: String,
      required: true,
    },
    userId: { type: ObjectId, required: true },
    roomId: {
      type: String,
      required: true,
    },
    issueId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

gameSchema.statics.setBet = async function (bet: Bet) {
  const user = await UserModel.getUserById(bet.userId!);
  if (!user) throw new Error('User not found');
  const doneBet = await this.create({
    content: bet.content, userId: user.id, roomId: bet.roomId, issueId: bet.issueId,
  });
  return doneBet;
};

gameSchema.statics.updateBetById = async function (betId: string, content: string) {
  const bet = await this.findOne({ _id: betId });
  if (!bet) throw new Error('Bet not found');
  const updatedBet = await this.findOneAndUpdate({ _id: betId }, { content }, { new: true });
  return updatedBet!;
};

gameSchema.statics.getBets = async function (roomId: string) {
  return this.find({ roomId });
};

export const GameModel = model<GameBet, GameModelStaticMethods>('gameModel', gameSchema);
