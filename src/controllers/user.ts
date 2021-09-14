import { Request, Response } from 'express';
import { Event } from '../constants';
import { encode } from '../middlewares/jwt';
import { RoomModel } from '../models/room';
import { User, UserModel } from '../models/user';
import cloudinary from '../utils/cloudinary';
import { checkRoomIdIsValid } from '../utils/userIdValidator';
import { leaveRoom } from '../utils/usersSocket';

export const onGetUserById = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.getUserById(req.params.id);
    return res.status(200).json(user);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onCreateUser = async (req: any, res: Response) => {
  try {
    const { roomId } = req.body;

    const avatar = await cloudinary.uploader.upload(req.file.path);
    const userToCreate: Partial<User> = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      position: req.body.position,
      avatar: avatar.secure_url,
      cloudinary_id: avatar.public_id,
      role: req.body.role,
    };

    if (roomId) {
      checkRoomIdIsValid(roomId);
      const room = RoomModel.getRoom(roomId);
      if (!room) throw new Error('Room not found');
      const user = await UserModel.createUser(userToCreate);
      await RoomModel.joinRoom(roomId, user.id);
      const authToken = await encode(user.id);
      return res.status(201).json({ authorization: authToken });
    }
    const user = await UserModel.createUser(userToCreate);
    const authToken = await encode(user.id);
    const room = await RoomModel.createRoom(user.id);
    return res.status(201).json({ authorization: authToken, room: room._id });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onDeleteUserById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const deleteInitiator = await UserModel.getUserById(req.userId);
    if (deleteInitiator.role !== 'master') {
      throw new Error('Not enough permissions');
    }
    const user = await UserModel.deleteUserById(req.params.id);
    if (!user) {
      return res.status(200).json({
        message: 'User not found',
      });
    }
    const io = req.app.get('io');
    await io.to(id).emit(Event.USER_DELETE, id);
    const socketIDs = leaveRoom(id);
    socketIDs.forEach((socketID) => {
      io.sockets.sockets.get(socketID).leave(id);
    });
    await RoomModel.deleteUserFromRoomById(req.params.id);
    await cloudinary.uploader.destroy(user.cloudinary_id!);
    await user.remove();
    return res.status(200).json({
      message: `Deleted user: ${user.name}.`,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};
