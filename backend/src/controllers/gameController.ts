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

  res.json({
    roomId,
    gameId: result.rows[0].id,
  });
};

export const joinGame = (req: Request, res: Response) => {
  const { roomId } = req.body;

  if (!roomId) return res.status(400).json({ message: "Room ID is required." });

  return res.json({ joined: true, roomId });
};

export const getGameMoves = async (req: Request, res: Response) => {
  const { gameId } = req.params;
  const gameIdInt = parseInt(gameId, 10);

  try {
    const result = await pool.query(
      `SELECT board
       FROM game_moves
       WHERE game_id = $1
       ORDER BY move_index ASC`,
      [gameIdInt]
    );

    const moves = result.rows.map((r) => r.board);
    res.json({ moves });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load game moves" });
  }
};

export const getGameHistory = async (req: any, res: any) => {
  const userId = req.user.id || req.user.userId;
  if (!userId)
    return res.status(400).json({ message: "User ID not found in token" });

  try {
    const { rows } = await pool.query(
      `
      SELECT
        g.id,
        g.room_id,
        g.winner,
        g.created_at,
        g.finished_at,
        g.player_x_user_id,
        g.player_o_user_id,
        ux.username AS player_x_username,
        uo.username AS player_o_username
      FROM games g
      LEFT JOIN users ux ON ux.id = g.player_x_user_id
      LEFT JOIN users uo ON uo.id = g.player_o_user_id
      WHERE
        (g.player_x_user_id = $1 OR g.player_o_user_id = $1)
        AND g.finished_at IS NOT NULL
      ORDER BY g.finished_at DESC
      `,
      [userId]
    );

    const history = rows.map((game) => {
      let result: "WIN" | "LOSS" | "DRAW";

      if (!game.winner) result = "DRAW";
      else if (
        (game.winner === "X" && game.player_x_user_id === userId) ||
        (game.winner === "O" && game.player_o_user_id === userId)
      ) {
        result = "WIN";
      } else {
        result = "LOSS";
      }

      const opponent =
        game.player_x_user_id === userId
          ? game.player_o_user_id
          : game.player_x_user_id;

      const opponentUsername =
        game.player_x_user_id === userId
          ? game.player_o_username
          : game.player_x_username;

      return {
        gameId: game.id,
        roomId: game.room_id,
        result,
        date: game.finished_at || game.created_at,
        opponent,
        opponentUsername,
      };
    });

    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load game history" });
  }
};
