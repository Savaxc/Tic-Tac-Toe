import { Server } from "socket.io";
import { pool } from "../config/db";
import jwt from "jsonwebtoken";

export const initGameSocket = (io: Server) => {
  interface GameHistory {
    gameId: number;
    moves: Array<Array<Array<string | null>>>;
    players: { X?: number; O?: number };
    restartVotes: Set<number>;
    restartTimer?: NodeJS.Timeout;
    countdown?: number;
  }

  const gameHistories = new Map<string, GameHistory>();
  const userToRoom = new Map<number, string>();

  const getActiveGame = async (roomId: string) => {
    const res = await pool.query(
      `SELECT id FROM games WHERE room_id = $1 AND finished_at IS NULL`,
      [roomId]
    );
    return res.rows[0] ?? null;
  };

  io.on("connection", (socket) => {
    // AUTH
    const token = socket.handshake.auth?.token;
    if (!token) return socket.disconnect();

    let userId: number;
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      userId = decoded.id;
    } catch {
      return socket.disconnect();
    }

    // JOIN ROOM
    socket.on("joinRoom", async (roomId: string) => {
      try {
        const game = await getActiveGame(roomId);
        if (!game) {
          socket.emit("roomError", "Room not found or closed");
          return;
        }

        let history = gameHistories.get(roomId);

        // PLAYER X (creator)
        if (!history) {
          history = {
            gameId: game.id,
            moves: [],
            players: { X: userId },
            restartVotes: new Set(),
          };

          gameHistories.set(roomId, history);
          socket.join(roomId);
          userToRoom.set(userId, roomId);
          socket.emit("assignSymbol", "X");
          return;
        }

        const { players } = history;

        // RECONNECT
        if (players.X === userId || players.O === userId) {
          socket.join(roomId);
          userToRoom.set(userId, roomId);
          socket.emit(
            "assignSymbol",
            players.X === userId ? "X" : "O"
          );
          socket.to(roomId).emit("opponentConnected");
          return;
        }

        // ROOM FULL
        if (players.X && players.O) {
          socket.emit("roomFull");
          return;
        }

        // PLAYER O
        players.O = userId;
        socket.join(roomId);
        userToRoom.set(userId, roomId);

        await pool.query(
          `UPDATE games SET player_o_user_id = $1 WHERE room_id = $2`,
          [userId, roomId]
        );

        socket.emit("assignSymbol", "O");
        io.to(roomId).emit("opponentConnected");
      } catch (err) {
        console.error(err);
        socket.emit("roomError", "Join failed");
      }
    });

    // PLAYER MOVE
    socket.on("playerMove", async ({ roomId, board }) => {
      const history = gameHistories.get(roomId);
      if (!history) return;

      const moveIndex = history.moves.length;
      history.moves.push(board);

      await pool.query(
        `
        INSERT INTO game_moves (game_id, move_index, board)
        VALUES ($1, $2, $3)
        `,
        [history.gameId, moveIndex, JSON.stringify(board)]
      );

      socket.to(roomId).emit("opponentMove", board);
    });

    // GAME OVER (WINNER = USER ID)
    socket.on("gameOver", async ({ roomId, winnerUserId }) => {
      try {
        await pool.query(
        `
        UPDATE games
        SET winner_user_id = $1,
            finished_at = NOW()
        WHERE room_id = $2
          AND finished_at IS NULL
        `,
          [winnerUserId, roomId]
        );

        io.to(roomId).emit("gameFinished", winnerUserId);
      } catch (err) {
        console.error("gameOver error:", err);
      }
    });

    // RESTART / REMATCH
    socket.on("requestRestart", async (roomId: string) => {
      const history = gameHistories.get(roomId);
      if (!history) return;

      history.restartVotes.add(userId);

      if (history.restartVotes.size === 1) {
        history.countdown = 10;
        io.to(roomId).emit("restartCountdown", history.countdown);

        history.restartTimer = setInterval(() => {
          history.countdown!--;
          io.to(roomId).emit("restartCountdown", history.countdown);

          if (history.countdown === 0) {
            clearInterval(history.restartTimer!);
            history.restartVotes.clear();
            history.countdown = undefined;
            io.to(roomId).emit("restartCanceled");
          }
        }, 1000);
      }

      if (history.restartVotes.size === 2) {
        clearInterval(history.restartTimer!);

        // zatvori staru
        await pool.query(
          `UPDATE games SET finished_at = NOW() WHERE id = $1`,
          [history.gameId]
        );

        // nova partija (ista soba, zamena strana)
        const newGame = await pool.query(
          `
          INSERT INTO games (room_id, player_x_user_id, player_o_user_id, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING id
          `,
          [roomId, history.players.O, history.players.X]
        );

        history.gameId = newGame.rows[0].id;
        history.moves = [];
        history.restartVotes.clear();
        history.countdown = undefined;

        history.players = {
          X: history.players.O,
          O: history.players.X,
        };

        io.to(roomId).emit("restartConfirmed", history.players);
      }
    });

    // DISCONNECT
    socket.on("disconnect", async () => {
      const roomId = userToRoom.get(userId);
      if (!roomId) return;

      socket.to(roomId).emit("opponentLeft");
      userToRoom.delete(userId);

      const room = io.sockets.adapter.rooms.get(roomId);
      if (!room || room.size === 0) {
        const history = gameHistories.get(roomId);
        gameHistories.delete(roomId);

        if (history) {
          const res = await pool.query(
            `SELECT COUNT(*) FROM game_moves WHERE game_id = $1`,
            [history.gameId]
          );

          if (Number(res.rows[0].count) === 0) {
            await pool.query(`DELETE FROM games WHERE id = $1`, [
              history.gameId,
            ]);
          }
        }
      }
    });
  });
};
