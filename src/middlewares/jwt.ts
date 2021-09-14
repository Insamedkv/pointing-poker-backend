import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { UserModel } from '../models/user';

dotenv.config();

export const encode = async (userId: string) => {
  const user = await UserModel.getUserById(userId);
  if (!user) {
    throw (new Error('User not found'));
  }
  const authToken = jwt.sign(
    {
      userId,
    },
    process.env.API_KEY!,
  );
  return authToken;
};

export const decodeMiddleware = (req: any, res: any, next: any) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ message: 'No token' });
  }
  try {
    const accessToken = req.headers.authorization;
    const decoded: any = jwt.verify(accessToken, process.env.API_KEY!);
    req.userId = decoded.userId;
    return next();
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
};
