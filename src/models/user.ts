import { Model, Schema, model } from 'mongoose';
import { ObjectId as MongoId } from 'mongodb';

export interface User {
  id: string,
  firstName: string,
  lastName?: string,
  position?: string,
  avatar?: string,
  cloudinary_id?: string,
  asObserver: boolean,
}

export interface UserModelStaticMethods extends Model<User> {
  getUserById(id: string): User;
  deleteUserById(id: string): any;
  createUser(user: Partial<User>): User;
  updateObserverStatus(userId: string, status: boolean): void;
}

const userSchema = new Schema<UserModelStaticMethods>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    position: { type: String },
    avatar: { type: String },
    cloudinary_id: { type: String },
    asObserver: { type: Boolean, required: true },
  },
  { timestamps: true },
);

userSchema.statics.createUser = async function (user: Partial<User>) {
  return this.create(user);
};

userSchema.statics.updateObserverStatus = async function (userId: string, asObserver: boolean) {
  await this.updateOne({ _id: new MongoId(userId) }, { $set: { asObserver } });
};

userSchema.statics.getUserById = async function (id: string) {
  const user = await this.findOne({ _id: id });
  if (!user) throw new Error('User not found');
  return user;
};

userSchema.statics.deleteUserById = async function (id: string) {
  const result = await this.findOneAndDelete({ _id: id });
  return result;
};

export const UserModel = model<User, UserModelStaticMethods>('userModel', userSchema);
