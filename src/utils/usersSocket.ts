export interface UserSocket {
  socketId: string;
  userId: string;
  roomId: string;
}

const users: Array<UserSocket> = [];

export function joinRoom(socketId: string, userId: string, roomId: string) {
  users.push({ socketId, userId, roomId });
  return users;
}

export function leaveRoom(userId: string) {
  const socketIDs: Array<string> = [];
  users.forEach((user) => {
    if (user.userId === userId) {
      socketIDs.push(user.socketId);
    }
  });
  return socketIDs;
}

export function deleteRoom(roomId: string) {
  const socketIDs: Array<string> = [];
  users.forEach((user) => {
    if (user.roomId === roomId) {
      socketIDs.push(user.socketId);
    }
  });
  return socketIDs;
}
