import { ObjectId as MongoId } from 'mongodb';
import {
  Model, Schema, model, ObjectId,
} from 'mongoose';
import cloudinary from '../utils/cloudinary';
import { UserModel } from './user';

export interface Rules {
  masterAsAPlayer: boolean,
  cardType: any[],
  newUsersEnter: boolean,
  autoRotateCardsAfterVote: boolean,
  changeChoiseAfterCardsRotate: boolean,
  isTimerNeeded: boolean,
  roundTime: number,
}

export interface Issue {
  issueTitle: string,
  priority: string,
  link: string,
}

interface RoomUser {
  user: string;
}

interface RoomCreator {
  roomCreator: string;
}

export interface Room {
  _id: ObjectId,
  roomTitle: string,
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
  getRoomIssues(roomId: string): Issue[];
  createRoomIssue(roomId: string, issue: Issue): void;
  deleteRoomIssueById(issueId: string): void;
  getRoom(roomId: string): Room;
  setRoomRules(roomId: string, rules: Rules): void;
  updateRoomIssueById(issueId: string, issue: Issue): Issue;
  updateRoomTitle (roomTitle: string, roomId: string): string;
}

const roomSchema = new Schema<Room, RoomModelStaticMethods>(
  {
    roomTitle: { type: String },
    rules: [
      {
        masterAsAPlayer: { type: Boolean },
        cardType: { type: Array },
        newUsersEnter: { type: Boolean },
        autoRotateCardsAfterVote: { type: Boolean },
        changeChoiseAfterCardsRotate: { type: Boolean },
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

roomSchema.statics.getRoomCreator = async function (roomId: string) {
  const room = await this.findOne({ _id: roomId });
  if (!room) throw new Error('Room not found');
  return room.roomCreator;
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
  return room.users;
};

roomSchema.statics.deleteUserFromRoomById = async function (id: string) {
  await this.updateOne({ 'users.user': new MongoId(id) }, { $pull: { users: { user: new MongoId(id) } } });
};

roomSchema.statics.getRoomIssues = async function (roomId: string) {
  const room = await this.findOne({ _id: roomId });
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
