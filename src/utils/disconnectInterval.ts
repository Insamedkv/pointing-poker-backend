import { Server } from 'socket.io';
import { RoomModel } from '../models/room';
import { User, UserModel } from '../models/user';
import { deleteRoom, disconnect } from './usersSocket';
import { Event } from '../constants';
import { onDeleteRoomById } from '../controllers/room';

export async function discon(socketId: string, socket: Server) {
  try {
    const userId = disconnect(socketId);
    if (userId === undefined) return;
    const room = await RoomModel.getRoomByUser(userId);
    const user: User = await UserModel.deleteUserById(userId);
    if (user.id === room.roomCreator) {
      const socketIDs = deleteRoom(room.id);
      socketIDs.forEach((socketID) => {
        socket.sockets.sockets.get(socketID)?.emit(Event.ROOM_DELETE);
        socket.sockets.sockets.get(socketID)?.leave(room.id);
      });
    }
    await RoomModel.deleteUserFromRoomById(userId);
    const users = await RoomModel.getRoomUsers(room.id);
    await socket.to(room.id).emit(Event.USER_DELETE, users);
  } catch (err) {
    console.log(err);
  }
}
