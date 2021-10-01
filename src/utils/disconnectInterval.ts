import { Socket } from 'socket.io';
import { RoomModel } from '../models/room';
import { UserModel } from '../models/user';
import cloudinary from './cloudinary';
import { disconnect } from './usersSocket';
import { Event } from '../constants';

export async function discon(socketId: string, socket: Socket) {
  try {
    const userId = disconnect(socketId);
    if (userId === undefined) return;
    console.log('userId', userId);
    const room = await RoomModel.getRoomByUser(userId);
    const user = await UserModel.deleteUserById(userId);
    await RoomModel.deleteUserFromRoomById(userId);
    // if (user.cloudinary_id) await cloudinary.uploader.destroy(user.cloudinary_id);
    // await user.remove();
    const users = await RoomModel.getRoomUsers(room.id);
    await socket.to(room.id).emit(Event.USER_DELETE, users);
  } catch (err) {
    console.log(err);
  }
}
