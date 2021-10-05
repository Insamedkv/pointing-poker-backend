import { Request, Response } from 'express';
import { parse } from 'json2csv';
import { GameBet, GameModel } from '../models/game';
import { RoomModel } from '../models/room';

export const downloadResultsInRoom = async (req: Request, res: Response) => {
  try {
    const objBets = await GameModel.getBetsByRoomId(req.params.id);
    const result = await RoomModel.getRoomIssues(req.params.id);
    const response = result.map((obj) => {
      const betsOnIssue = objBets.filter((bet) => bet.issueId === obj._id?.toHexString());
      return { ...obj, betsOnIssue, summary: 0 };
    });
    response.forEach((resArray:any) => {
      resArray.summary = resArray.betsOnIssue.length;
      resArray.betsOnIssue.forEach((issueBet: GameBet) => {
        resArray[issueBet.content] = resArray[issueBet.content] + 1 || 1;
      });
    });
    response.forEach((obj: any) => {
      delete obj._id;
      delete obj.betsOnIssue;
      delete obj.time;
      // eslint-disable-next-line no-restricted-syntax
      for (const key in obj) {
        if (typeof obj[key] === 'number' && key !== 'summary') {
          obj[key] = ((obj[key] / obj.summary) * 100).toFixed(2);
        }
      }
    });
    const constFields = ['issueTitle', 'priority', 'link', 'summary'];
    const userVoteFields: any[] = [];
    response.forEach((obj) => {
      const objKeys = Object.keys(obj);
      objKeys.forEach((key) => {
        if (!constFields.includes(key) && !userVoteFields.includes(key)) { userVoteFields.push(key); }
      });
    });
    const csv = parse(response, { fields: constFields.concat(userVoteFields.sort((a, b) => a - b)), delimiter: ';' });
    return res.send(csv);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};
