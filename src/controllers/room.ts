import { Request, Response } from 'express';
import { Event } from '../constants';
import { MessageModel } from '../models/message';
import { RoomModel } from '../models/room';
import { UserModel } from '../models/user';
import { isValidFields } from '../utils/checkIssueFields';
import { checkRoomIdIsValid } from '../utils/userIdValidator';
import { deleteRoom, leaveRoom } from '../utils/usersSocket';

export const onGetRoomUsers = async (req: Request, res: Response) => {
  try {
    checkRoomIdIsValid(req.params.id);
    const roomUsers = await RoomModel.getRoomUsers(req.params.id);
    return res.status(201).json(roomUsers);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};

export const onGetRoomIssues = async (req: Request, res: Response) => {
  try {
    const roomIssues = await RoomModel.getRoomIssues(req.params.id);
    return res.status(201).json(roomIssues);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onCreateRoomIssue = async (req: Request, res: Response) => {
  try {
    const { issueTitle, priority, link } = req.body;
    const issueFields = {
      issueTitle,
      priority,
      link,
    };
    isValidFields(issueFields);
    const issue = await RoomModel.createRoomIssue(req.params.id, issueFields);
    return res.status(201).json(issue);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onDeleteRoomIssue = async (req: Request, res: Response) => {
  try {
    await RoomModel.deleteRoomIssueById(req.params.id);
    return res.status(200).json({
      message: 'Issue deleted',
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onUpdateRoomIssue = async (req: Request, res: Response) => {
  try {
    const { issueTitle, priority, link } = req.body;
    const issueFields = {
      issueTitle,
      priority,
      link,
    };
    isValidFields(issueFields);
    await RoomModel.updateRoomIssueById(req.params.id, issueFields);
    return res.status(200).json({
      message: 'Issue updated',
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onUpdateRoomTitle = async (req: Request, res: Response) => {
  try {
    const { roomTitle } = req.body;
    await RoomModel.updateRoomTitle(req.params.id, roomTitle);
    return res.status(200).json({
      message: 'Title updated',
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onDeleteRoomById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    checkRoomIdIsValid(id);
    const deleteInitiator = await UserModel.getUserById(req.userId);
    if (deleteInitiator.role !== 'master') {
      throw new Error('Not enough permissions');
    }
    const io = req.app.get('io');
    await io.to(id).emit(Event.ROOM_DELETE, id);
    const socketIDs = deleteRoom(id);
    socketIDs.forEach((socketID) => {
      io.sockets.sockets.get(socketID).leave(id);
    });
    await RoomModel.deleteRoomById(id);
    return res.status(200).json({
      message: 'Room deleted',
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onSetRoomRules = async (req: Request, res: Response) => {
  try {
    const {
      masterAsAPlayer,
      cardType,
      newUsersEnter,
      autoRotateCardsAfterVote,
      changeChoiseAfterCardsRotate,
      isTimerNeeded,
      roundTime,
    } = req.body;
    const rules = {
      masterAsAPlayer,
      cardType,
      newUsersEnter,
      autoRotateCardsAfterVote,
      changeChoiseAfterCardsRotate,
      isTimerNeeded,
      roundTime,
    };
    const issueValues = Object.values(rules);
    issueValues.forEach((value) => {
      if (value === undefined) {
        return res.status(400).json({
          error: 'Rules undefined',
        });
      }
    });
    checkRoomIdIsValid(req.params.id);
    await RoomModel.setRoomRules(req.params.id, rules);
    return res.status(201).json({
      status: 'Rules set successfully',
    });
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};

export const onLeaveRoom = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const room = await RoomModel.findOne({ _id: id });
    if (room) {
      const userIndex = room.users.findIndex((roomUser) => roomUser.user === req.userId);
      if (userIndex < 0) {
        throw new Error('User not foound');
      } else {
        const userDetails = await UserModel.getUserById(req.userId);
        const sockets = await req.app.get('io').sockets.sockets;
        const socketID = leaveRoom(req.userId);
        const currentSocket = await sockets.get(socketID[0]);
        await currentSocket.to(id).emit(Event.LEAVE, { userDetails, leftRoom: id });
        if (room.users.length === 1) {
          await RoomModel.deleteRoomById(id);
        } else {
          room.users.splice(userIndex, 1);
          await room.save();
          const newMsg = await MessageModel.createMsg({
            userRoom: { roomId: id },
            content: `${userDetails.firstName} left the room.`,
          });
          await currentSocket.to(id).emit(Event.MESSAGE, { newMsg });
          socketID.forEach((socket) => {
            sockets.get(socket).leave(id);
          });
          return res.status(200).json({
            status: 'success',
          });
        }
      }
    } else {
      throw new Error('Room not found');
    }
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};
