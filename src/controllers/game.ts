import { Request, Response } from 'express';
import { GameModel } from '../models/game';

export const onGetBets = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.body;
    const bets = await GameModel.getBets(roomId);
    return res.status(200).json(bets);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};

export const onUpdateBetById = async (req: Request, res: Response) => {
  try {
    // check room setting is necessary for this method?
    const { betId, content } = req.body;
    const updatedBet = await GameModel.updateBetById(betId, content);
    return res.status(200).json(updatedBet);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};
