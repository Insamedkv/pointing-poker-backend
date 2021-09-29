import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { Event } from '../constants';
import { MessageModel } from '../models/message';
import { RoomModel } from '../models/room';
import { UserModel } from '../models/user';
import { isValidFields } from '../utils/checkIssueFields';
import cloudinary from '../utils/cloudinary';
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

export const onGetRoom = async (req: Request, res: Response) => {
  try {
    checkRoomIdIsValid(req.params.id);
    const room = await RoomModel.getRoom(req.params.id);
    return res.status(201).json(room);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};

export const onGetRoomCreator = async (req: Request, res: Response) => {
  try {
    const roomCreator = await RoomModel.getRoomCreator(req.params.id);
    return res.status(201).json(roomCreator);
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

export const onCreateRoomIssue = (ioServer: Server) => async (req: Request, res: Response) => {
  try {
    const { issueTitle, priority, link } = req.body;
    const issueFields = {
      issueTitle,
      priority,
      link,
    };
    isValidFields(issueFields);
    await RoomModel.createRoomIssue(req.params.id, issueFields);
    const issueList = await RoomModel.getRoomIssues(req.params.id);
    await ioServer.to(req.params.id).emit(Event.ON_ISSUE_CREATE, issueList);
    return res.status(201).json('Issue created');
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onDeleteRoomIssue = (ioServer: Server) => async (req: Request, res: Response) => {
  try {
    await RoomModel.deleteRoomIssueById(req.params.id);
    const issueList = await RoomModel.getRoomIssues(req.params.roomid);
    console.log(issueList);
    await ioServer.to(req.params.roomid).emit(Event.ON_ISSUE_CREATE, issueList);
    return res.status(200).json('issue deleted');
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onUpdateRoomIssue = (ioServer: Server) => async (req: Request, res: Response) => {
  try {
    const { issueTitle, priority, link } = req.body;
    const issueFields = {
      issueTitle,
      priority,
      link,
    };
    isValidFields(issueFields);
    await RoomModel.updateRoomIssueById(req.params.id, issueFields);
    const issueList = await RoomModel.getRoomIssues(req.params.roomid);
    await ioServer.to(req.params.roomid).emit(Event.ON_ISSUE_CREATE, issueList);
    return res.status(200).json('Issue updated');
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onUpdateRoomTitle = (ioServer: Server) => async (req: Request, res: Response) => {
  try {
    const { roomTitle } = req.body;
    const title = await RoomModel.updateRoomTitle(req.params.id, roomTitle);
    await ioServer.to(req.params.id).emit(Event.ON_TITLE_UPDATE, title);
    return res.status(200).json('Title updated');
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onUpdateGameStatus = async (req: Request, res: Response) => {
  try {
    const { isGameStarted } = req.body;
    await RoomModel.updateGameStatus(req.params.roomid, isGameStarted);
    // await ioServer.to(req.params.id).emit(Event.ON_TITLE_UPDATE, title);
    return res.status(200).json('Game status updated');
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onDeleteRoomById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    checkRoomIdIsValid(id);
    const deleteInitiator: any = await UserModel.getUserById(req.userId);
    const owner = await RoomModel.isRoomOwner(deleteInitiator._id);
    if (owner.toString() !== deleteInitiator._id.toString()) {
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
      success: true,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const onSetRoomRules = async (req: Request, res: Response) => {
  try {
    const {
      scrumMasterAsAPlayer,
      cardType,
      newUsersEnter,
      autoRotateCardsAfterVote,
      shortScoreType,
      changingCardInEnd,
      isTimerNeeded,
      roundTime,
    } = req.body;
    const rules = {
      scrumMasterAsAPlayer,
      cardType,
      newUsersEnter,
      autoRotateCardsAfterVote,
      shortScoreType,
      changingCardInEnd,
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
    checkRoomIdIsValid(req.params.roomid);
    const setRules = await RoomModel.setRoomRules(req.params.roomid, rules);
    return res.status(201).json(setRules);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};

export const onLeaveRoom = (ioServer: Server) => async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const room = await RoomModel.findOne({ _id: id });
    if (room) {
      const userIndex = room.users.findIndex((roomUser) => roomUser.user === req.userId);
      if (userIndex < 0) {
        throw new Error('User not foound');
      } else {
        // const userDetails = await UserModel.getUserById(req.userId);
        // const roomBy = await RoomModel.getRoomByUser(req.userId);
        const user = await UserModel.deleteUserById(req.userId);
        await RoomModel.deleteUserFromRoomById(req.userId);
        if (user.cloudinary_id !== null) await cloudinary.uploader.destroy(user.cloudinary_id!);
        await user.remove();
        const users = await RoomModel.getRoomUsers(id);
        await ioServer.to(room.id).emit(Event.USER_DELETE, users);
        // const sockets = await req.app.get('io').sockets.sockets;
        leaveRoom(req.userId);
        // const currentSocket = await sockets.get(socketID[0]);
        // await currentSocket.to(id).emit(Event.USER_DELETE, { userDetails, leftRoom: id });
        if (room.users.length === 1) {
          await RoomModel.deleteRoomById(id);
        }

        // } else {
        //   room.users.splice(userIndex, 1);
        //   await room.save();
        // const newMsg = await MessageModel.createMsg({ // ???????
        //   roomId: id,
        //   content: `${userDetails.firstName} left the room.`,
        // });
        // await currentSocket.to(id).emit(Event.MESSAGE, { newMsg });
        // socketID.forEach((socket) => {
        //   sockets.get(socket).leave(id);
        // });
        return res.status(200).json({
          status: 'success',
        });
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

export const onCheckRoomCreated = async (req: Request, res: Response) => {
  try {
    await RoomModel.getRoom(req.params.id);
    return res.status(200).json({
      status: 'Room found',
    });
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};
