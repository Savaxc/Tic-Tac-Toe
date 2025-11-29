import { Request, Response } from "express";

export const createGame = (req: Request, res: Response) => {
  return res.json({ roomId: Date.now().toString() });
};
