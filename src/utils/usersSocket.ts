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

export function reJoinRoom(socketId: string, userId: string) {
  users.forEach((user) => {
    if (user.userId === userId) {
      user.socketId = socketId;
    }
  });
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

export function disconnect(socketId: string) {
  const userId = users.filter((user) => user.socketId === socketId);
  if (userId.length === 0) return;
  return userId[0].userId;
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
