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

  // HELPERS
  const getActiveGame = async (roomId: string) => {
    const res = await pool.query(
      `SELECT id FROM games WHERE room_id = $1 AND finished_at IS NULL`,
      [roomId]
    );
    return res.rows[0] ?? null;
  };

  // CONNECTION
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // AUTH
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.disconnect();
      return;
    }

    let userId: number;
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      userId = decoded.id;
    } catch {
      socket.disconnect();
      return;
    }

    // JOIN ROOM
    socket.on("joinRoom", async (roomId: string) => {
      try {
        const game = await getActiveGame(roomId);

        if (!game) {
          socket.emit("roomError", "Room does not exist or was closed.");
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
        socket.to(roomId).emit("opponentConnected");
      } catch (err) {
        console.error("joinRoom error:", err);
        socket.emit("roomError", "Failed to join room");
      }
    });

    // PLAYER MOVE
    socket.on("playerMove", async ({ roomId, board }) => {
      const history = gameHistories.get(roomId);
      if (!history) return;

      const moveIndex = history.moves.length;
      history.moves.push(board);

      try {
        await pool.query(
          `
          INSERT INTO game_moves (game_id, move_index, board)
          VALUES ($1, $2, $3)
          `,
          [history.gameId, moveIndex, JSON.stringify(board)]
        );
      } catch (err) {
        console.error("Failed to save move:", err);
      }

      socket.to(roomId).emit("opponentMove", board);
    });

    // GAME OVER
    socket.on("gameOver", async ({ roomId, winner }) => {
      try {
        await pool.query(
          `
          UPDATE games
          SET winner = $1, finished_at = NOW()
          WHERE room_id = $2
          `,
          [winner, roomId]
        );

        io.to(roomId).emit("gameFinished", winner);
      } catch (err) {
        console.error("gameOver error:", err);
      }
    });

    // RESTART
    socket.on("requestRestart", (roomId: string) => {
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

        history.players = {
          X: history.players.O,
          O: history.players.X,
        };

        history.moves = [];
        history.restartVotes.clear();
        history.countdown = undefined;

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
          // proveri da li postoji ijedan potez
          const movesRes = await pool.query(
            `SELECT COUNT(*) FROM game_moves WHERE game_id = $1`,
            [history.gameId]
          );

          const movesCount = Number(movesRes.rows[0].count);

          if (movesCount === 0) {
            await pool.query(`DELETE FROM games WHERE id = $1`, [
              history.gameId,
            ]);
            console.log(`Game ${history.gameId} deleted (never started)`);
            return;
          }
        }

        console.log(`Room ${roomId} closed (game already finished or abandoned)`);
      }
    });
  });
};
