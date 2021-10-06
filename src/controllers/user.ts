import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { Event } from '../constants';
import { encode } from '../middlewares/jwt';
import { RoomModel } from '../models/room';
import { User, UserModel } from '../models/user';
import cloudinary from '../utils/cloudinary';
import { checkRoomIdIsValid } from '../utils/userIdValidator';
import { joinRoom, leaveRoom } from '../utils/usersSocket';

export const onGetUserById = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.getUserById(req.params.id);
    return res.status(200).json(user);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onCreateUser = (ioServer: Server) => async (req: any, res: Response) => {
  try {
    const { roomId } = req.body;
    const { socketId } = req.body;
    const avatar = req.body.avatar === '' ? '' : await cloudinary.uploader.upload(req.body.avatar);
    const userToCreate: Partial<User> = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      position: req.body.position,
      avatar: avatar === '' ? '' : avatar?.secure_url,
      cloudinary_id: avatar === '' ? '' : avatar?.public_id,
      asObserver: req.body.asObserver,
    };
    if (roomId) {
      checkRoomIdIsValid(roomId);
      const room = await RoomModel.getRoom(roomId);
      if (!room) throw new Error('Room not found');
      const user = await UserModel.createUser(userToCreate);
      await RoomModel.joinRoom(roomId, user.id);
      joinRoom(socketId, user.id, room.id);
      if (room.isGameStarted === true && room.rules[0].newUsersEnter === false) {
        (ioServer.sockets.sockets.get(socketId))?.emit(Event.BLUR);
      }
      ioServer.in(socketId).socketsJoin(roomId);
      const response = await RoomModel.getRoomUsers(roomId);
      ioServer.to(roomId).emit(Event.ONJOIN, response);
      const authToken = await encode(user.id);
      return res.status(201).json({ authorization: authToken, userData: user, room });
    }
    const user = await UserModel.createUser(userToCreate);
    const authToken = await encode(user.id);
    const room = await RoomModel.createRoom(user.id);
    joinRoom(socketId, user.id, room.id);
    ioServer.in(socketId).socketsJoin(room.id);
    return res.status(201).json({ authorization: authToken, userData: user, room });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onDeleteUserById = (ioServer: Server) => async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const deleteInitiator: any = await UserModel.getUserById(req.userId);
    const owner = await RoomModel.isRoomOwner(deleteInitiator._id);
    const room = await RoomModel.getRoomByUser(id);
    if (owner.toString() !== deleteInitiator._id.toString()) {
      throw new Error('Not enough permissions');
    }
    const user = await UserModel.deleteUserById(id);
    if (!user) {
      return res.status(200).json({
        message: 'User for delete not found',
      });
    }
    await RoomModel.deleteUserFromRoomById(id);
    if (user.cloudinary_id) await cloudinary.uploader.destroy(user.cloudinary_id);
    await user.remove();
    const users = await RoomModel.getRoomUsers(room.id);
    const socketIDs = leaveRoom(id);
    (ioServer.sockets.sockets.get(socketIDs[0]))?.emit(Event.KICK);
    await ioServer.to(room.id).emit(Event.USER_DELETE, users);
    return res.status(200).json({
      message: `Deleted user: ${user.firstName}.`,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};
