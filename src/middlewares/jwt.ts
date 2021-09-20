import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { UserModel } from '../models/user';
import { config } from '../config/db.config';

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
    config.API_KEY!,
  );
  return authToken;
};

export const decodeMiddleware = (req: any, res: any, next: any) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ message: 'No token' });
  }
  try {
    const accessToken = req.headers.authorization;
    const decoded: any = jwt.verify(accessToken, config.API_KEY);
    req.userId = decoded.userId;
    return next();
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
};
