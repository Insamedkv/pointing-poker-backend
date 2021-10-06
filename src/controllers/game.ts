import { Request, Response } from 'express';
import { GameModel } from '../models/game';

export const onGetBets = async (req: Request, res: Response) => {
  try {
    const bets = await GameModel.getBetsByIssueId(req.params.id);
    return res.status(200).json(bets);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};
