import { ObjectId } from 'mongodb';

export const checkRoomIdIsValid = (roomId: string): void => {
  if (!ObjectId.isValid(roomId)) {
    throw new Error('Invalid RoomID');
  }
};
