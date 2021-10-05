import { ObjectId as MongoId, ObjectId } from 'mongodb';
import {
  Model, Schema, model,
} from 'mongoose';
import cloudinary from '../utils/cloudinary';
import { UserModel } from './user';

export interface Rules {
  scrumMasterAsAPlayer: boolean;
  cardType: any[];
  newUsersEnter: boolean;
  autoRotateCardsAfterVote: boolean;
  shortScoreType: string;
  changingCardInEnd: boolean;
  isTimerNeeded: boolean;
  roundTime: number;
}

export interface Issue {
  _id?: ObjectId;
  issueTitle: string;
  priority: string;
  link: string;
}

interface RoomUser {
  user: string;
}

interface RoomCreator {
  roomCreator: string;
}

export interface Room {
  id: string;
  isGameStarted: boolean;
  roomTitle: string;
  rules: Array<Rules>;
  users: Array<RoomUser>;
  issues: Array<Issue>;
  roomCreator: string;
}

export interface RoomModelStaticMethods extends Model<Room> {
  createRoom(userId: string): Room;
  joinRoom(roomId: string, userId: string): void;
  deleteRoomById(userId: string): void;
  isRoomOwner(userId: string): string;
  getRoomUsers(roomId: string): Room;
  getRoomCreator(roomId: string): RoomCreator;
  deleteUserFromRoomById(id: string): void;
  getRoomIssues(roomId: string): Promise<Issue[]>;
  createRoomIssue(roomId: string, issue: Issue): void;
  deleteRoomIssueById(issueId: string): void;
  getRoom(roomId: string): Room;
  getRoomByUser(userId: string): Room;
  setRoomRules(roomId: string, rules: Rules): void;
  updateRoomIssueById(issueId: string, issue: Issue): Issue;
  updateRoomTitle (roomTitle: string, roomId: string): string;
  updateGameStatus(roomId: string, isGameStarted: boolean): string;
}

const roomSchema = new Schema<Room, RoomModelStaticMethods>(
  {
    isGameStarted: { type: Boolean },
    roomTitle: { type: String },
    rules: [
      {
        scrumMasterAsAPlayer: { type: Boolean },
        cardType: { type: Array },
        newUsersEnter: { type: Boolean },
        autoRotateCardsAfterVote: { type: Boolean },
        shortScoreType: { type: String },
        changingCardInEnd: { type: Boolean },
        isTimerNeeded: { type: Boolean },
        roundTime: { type: Number },
      },
    ],
    users: [
      {
        user: { type: String },
      },
    ],
    issues: [
      {
        issueTitle: { type: String },
        priority: { type: String },
        link: { type: String },
        time: { type: Date, default: Date.now },
      },
    ],
    roomCreator: { type: Schema.Types.ObjectId, ref: 'roomModel' },
  },
  { timestamps: true },
);

roomSchema.statics.createRoom = async function (userId: string) {
  const room = await this.create({ users: [{ user: userId }], roomTitle: 'Planning poker', roomCreator: userId });
  return room;
};

roomSchema.statics.getRoom = async function (roomId: string) {
  const room = await this.findOne({ _id: roomId });
  if (room === null) throw new Error('Room not found');
  return room;
};

roomSchema.statics.getRoomByUser = async function (userId: string) {
  return this.findOne({ 'users.user': userId });
};

roomSchema.statics.getRoomCreator = async function (roomId: string) {
  const room = await this.findOne({ _id: roomId });
  if (!room) throw new Error('Room not found');
  const roomCreator = await UserModel.getUserById(room.roomCreator);
  return roomCreator;
};

roomSchema.statics.isRoomOwner = async function (userId: string) {
  const room = await this.findOne({ roomCreator: userId });
  if (!room) throw new Error('Not enough permissions');
  return room.roomCreator;
};

roomSchema.statics.joinRoom = async function (
  roomId: string,
  userId: string,
) {
  const room = await this.findOne({ _id: roomId });
  if (room === null) throw new Error('Room not found');
  room.users.push({ user: userId });
  await room.save();
};

roomSchema.statics.deleteRoomById = async function (roomId: string) {
  const room = await this.findOne({ _id: roomId });
  if (!room) throw new Error('Room not found');
  await Promise.all(room.users.map(async (user) => {
    const userForDel = await UserModel.deleteUserById(user.user);
    if (!userForDel) throw new Error('User not found');
    await cloudinary.uploader.destroy(userForDel.cloudinary_id!);
  }));
  await this.findOneAndDelete({ _id: roomId });
};

roomSchema.statics.getRoomUsers = async function (roomId: string) {
  const room = await this.findOne({ _id: roomId });
  if (!room) throw new Error('Room not found');
  const userArray = room.users.map((userObj) => (new Promise((res) => res(UserModel.getUserById(userObj.user)))));
  const userResolve = await Promise.all(userArray);
  return userResolve;
};

roomSchema.statics.deleteUserFromRoomById = async function (id: string) {
  await this.updateOne({ 'users.user': new MongoId(id) }, { $pull: { users: { user: new MongoId(id) } } });
};

roomSchema.statics.getRoomIssues = async function (roomId: string) {
  const room = await this.findOne({ _id: roomId }).lean();
  if (!room) throw (new Error('Room not found'));
  return room.issues;
};

roomSchema.statics.createRoomIssue = async function (roomId: string, issue: Issue) {
  const room = await this.findOne({ _id: roomId });
  if (!room) throw new Error('Room not found');
  room.issues.push(issue);
  await room.save();
  return room.issues[room.issues.length - 1];
};

roomSchema.statics.deleteRoomIssueById = async function (issueId: string) {
  await this.updateOne({ 'issues._id': new MongoId(issueId) }, { $pull: { issues: { _id: new MongoId(issueId) } } });
};

roomSchema.statics.updateRoomIssueById = async function (issueId: string, issue: Issue) {
  const { issueTitle, priority, link } = issue;
  await this.updateOne({ 'issues._id': new MongoId(issueId) },
    {
      $set: { 'issues.$.issueTitle': issueTitle, 'issues.$.priority': priority, 'issues.$.link': link },
    });
  const updated: any = await this.find({ 'issues._id': issueId }, { 'issues.$': 1 });
  return updated[0].issues[0];
};

roomSchema.statics.updateRoomTitle = async function (roomId: string, roomTitle: string) {
  await this.updateOne({ _id: new MongoId(roomId) }, { $set: { roomTitle } });
  const room = await this.findOne({ _id: roomId });
  return room?.roomTitle;
};

roomSchema.statics.updateGameStatus = async function (roomId: string, isGameStarted: boolean) {
  await this.updateOne({ _id: new MongoId(roomId) }, { $set: { isGameStarted } });
  const room = await this.findOne({ _id: roomId });
  return room?.isGameStarted;
};

roomSchema.statics.setRoomRules = async function (roomId: string, rules: Rules) {
  const room = await this.findOne({ _id: roomId });
  if (!room) throw new Error('Room not found');
  room.rules.pop();
  room.rules.push(rules);
  await room.save();
  return room.rules[0];
};

roomSchema.statics.updateTitle = async function (roomTitle: string, roomId: string) {
  await this.updateOne({ _id: new MongoId(roomId) },
    {
      $set: { roomTitle },
    });
  const room = await this.findOne({ _id: roomId });
  return room?.roomTitle;
};

export const RoomModel = model<Room, RoomModelStaticMethods>('roomModel', roomSchema);
