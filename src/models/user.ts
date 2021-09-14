import { Model, Schema, model } from 'mongoose';

export interface User {
  id: string,
  firstName: string,
  lastName?: string,
  position?: string,
  avatar?: string,
  cloudinary_id?: string,
  role: string,
}

export interface UserModelStaticMethods extends Model<User> {
  getUserById(id: string): User;
  deleteUserById(id: string): any;
  createUser(user: Partial<User>): User;
}

const userSchema = new Schema<UserModelStaticMethods>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    position: { type: String },
    avatar: { type: String },
    cloudinary_id: { type: String },
    role: { type: String, required: true },
  },
  { timestamps: true },
);

userSchema.statics.createUser = async function (user: Partial<User>) {
  return this.create(user);
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
