import { Request, Response } from "express";

export const createGame = (req: Request, res: Response) => {
  return res.json({ roomId: Date.now().toString() });
};


export const joinGame = (req: Request, res: Response) => {
  const { roomId } = req.body;

  if(!roomId)
    return res.status(400).json({ message: "Room ID is required." });

  return res.json({ joined: true, roomId });
};