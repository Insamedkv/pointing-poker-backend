import { Model, Schema, model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { UserModel } from './user';
import { Bet } from '../types';

export interface GameBet {
  content: string;
  userId: string;
  roomId: string;
  issueId: string;
}

export interface GameModelStaticMethods extends Model<GameBet> {
  setAndUpdateBet(bet: Bet): GameBet;
  updateBetById(betId: string, content: string): GameBet;
  getBetsByIssueId(issueId: string): GameBet[];
  deleteBetsOnRestart(issueId: string): void;
  getBetsByRoomId(roomId: string): Promise<GameBet[]>;
}

const gameSchema = new Schema<GameBet, GameModelStaticMethods>(
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
    issueId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

gameSchema.statics.setAndUpdateBet = async function (bet: Bet) {
  const exisitingBet = await this.findOne({ userId: bet.userId, issueId: bet.issueId });
  if (exisitingBet) {
    console.log('Exisiting bet update');
    await this.findOneAndUpdate({ userId: bet.userId, issueId: bet.issueId },
      { content: bet.content }, { new: true });
  } else {
    console.log('Create bet');
    await this.create({
      content: bet.content, userId: bet.userId, roomId: bet.roomId, issueId: bet.issueId,
    });
  }
  const doneBet = this.find({ issueId: bet.issueId });
  return doneBet;
};

// gameSchema.statics.updateBetById = async function (betId: string, content: string) {
//   const bet = await this.findOne({ _id: betId });
//   if (!bet) throw new Error('Bet not found');
//   const updatedBet = await this.findOneAndUpdate({ _id: betId }, { content }, { new: true });
//   return updatedBet!;
// };

gameSchema.statics.deleteBetsOnRestart = async function (issueId) {
  await this.deleteMany({ issueId });
};

gameSchema.statics.getBetsByIssueId = async function (issueId: string) {
  return this.find({ issueId });
};

gameSchema.statics.getBetsByRoomId = async function (roomId: string) {
  return this.find({ roomId });
};

export const GameModel = model<GameBet, GameModelStaticMethods>('gameModel', gameSchema);
