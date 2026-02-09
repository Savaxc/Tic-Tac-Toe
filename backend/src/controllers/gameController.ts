import { Request, Response } from "express";
import { pool } from "../config/db";

export const createGame = async (req: any, res: Response) => {
  const userId = req.user.id;
  const roomId = Date.now().toString();

  const result = await pool.query(
    `
    INSERT INTO games (room_id, player_x_user_id, created_at)
    VALUES ($1, $2, NOW())
    RETURNING id
    `,
    [roomId, userId]
  );

  res.json({ roomId, gameId: result.rows[0].id });
};

export const joinGame = (req: Request, res: Response) => {
  const { roomId } = req.body;

  if (!roomId) return res.status(400).json({ message: "Room ID is required." });

  return res.json({ joined: true, roomId });
};

export const getGameMoves = async (req: Request, res: Response) => {
  const gameId = Number(req.params.gameId);

  const { rows } = await pool.query(
    `
    SELECT board
    FROM game_moves
    WHERE game_id = $1
    ORDER BY move_index ASC
    `,
    [gameId]
  );

  res.json({ moves: rows.map((r) => r.board) });
};

export const getGameHistory = async (req: any, res: Response) => {
  const userId = req.user.id;

  const { rows } = await pool.query(
    `
    SELECT
      g.id,
      g.room_id,
      g.finished_at,
      g.created_at,
      g.winner_user_id,
      g.player_x_user_id,
      g.player_o_user_id,
      ux.username AS x_username,
      uo.username AS o_username
    FROM games g
    JOIN users ux ON ux.id = g.player_x_user_id
    LEFT JOIN users uo ON uo.id = g.player_o_user_id
    WHERE
      (g.player_x_user_id = $1 OR g.player_o_user_id = $1)
      AND g.finished_at IS NOT NULL
    ORDER BY g.finished_at DESC
    `,
    [userId]
  );

  const history = rows.map((g) => {
    let result: "WIN" | "LOSS" | "DRAW";

    if (!g.winner_user_id) result = "DRAW";
    else if (g.winner_user_id === userId) result = "WIN";
    else result = "LOSS";

    const opponentUsername =
      g.player_x_user_id === userId
        ? g.o_username
        : g.x_username;

    return {
      gameId: g.id,
      roomId: g.room_id,
      result,
      date: g.finished_at || g.created_at,
      opponentUsername,
    };
  });

  res.json(history);
};
