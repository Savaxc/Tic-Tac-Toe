import { Server } from "socket.io";

export const initGameSocket = (io: Server) => {
  interface GameHistory {
    moves: Array<Array<Array<string | null>>>;
    players: { X?: string; O?: string };
  }

  const gameHistories: Map<string, GameHistory> = new Map();
  const socketToSession: Map<string, string> = new Map();
  const sessionToRoom: Map<string, string> = new Map();

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // REGISTRACIJA SESIJE
    socket.on("registerSession", (sessionId: string) => {
      socketToSession.set(socket.id, sessionId);
      console.log("REGISTER SESSION RECEIVED:", sessionId);
      console.log(`Registered session ${sessionId} for socket ${socket.id}`);
    });

    // CREATE ROOM
    socket.on("createRoom", (roomId: string) => {
      const sessionId = socketToSession.get(socket.id);
      if (!sessionId) return;

      if (gameHistories.has(roomId)) {
        socket.emit("roomAlreadyExists");
        return;
      }

      socket.join(roomId);

      gameHistories.set(roomId, {
        moves: [],
        players: { X: sessionId },
      });

      sessionToRoom.set(sessionId, roomId);

      socket.emit("assignSymbol", "X");

      console.log(`Room created: ${roomId} by session ${sessionId}`);
    });

    // JOIN ROOM
    socket.on("joinRoom", (roomId: string) => {
      const sessionId = socketToSession.get(socket.id);
      if (!sessionId) return;

      const history = gameHistories.get(roomId);
      if (!history) {
        socket.emit("roomNotFound");
        return;
      }

      // check current count
      const room = io.sockets.adapter.rooms.get(roomId);
      const currentCount = room ? room.size : 0;

      const players = history.players;

      // If session was in room -> recconnect
      if (players.X === sessionId) {
        socket.join(roomId);
        sessionToRoom.set(sessionId, roomId);
        socket.emit("assignSymbol", "X");
        socket.to(roomId).emit("opponentConnected");
        return;
      }

      if (players.O === sessionId) {
        socket.join(roomId);
        sessionToRoom.set(sessionId, roomId);
        socket.emit("assignSymbol", "O");
        socket.to(roomId).emit("opponentConnected");
        return;
      }

      if (currentCount >= 2) {
        socket.emit("roomFull");
        return;
      }

      socket.join(roomId);
      sessionToRoom.set(sessionId, roomId);

      if (!players.X) {
        players.X = sessionId;
        socket.emit("assignSymbol", "X");
      } else {
        players.O = sessionId;
        socket.emit("assignSymbol", "O");
        socket.to(roomId).emit("opponentConnected");
      }

      gameHistories.set(roomId, history);

      console.log(`Session ${sessionId} joined room ${roomId}`);
    });

    // PLAYER MOVE
    socket.on("playerMove", ({ roomId, board }) => {
      socket.to(roomId).emit("opponentMove", board);

      const history = gameHistories.get(roomId);
      if (!history) return;

      history.moves.push(board);
    });

    // GAME HISTORY
    socket.on("getGameHistory", (roomId, cb) => {
      cb(gameHistories.get(roomId) || null);
    });

    // GAME OVER
    socket.on("gameOver", ({ roomId, winner }) => {
      io.to(roomId).emit("gameFinished", winner);
    });

    // RESTART
    socket.on("restartGame", ({ roomId }) => {
      const h = gameHistories.get(roomId);
      if (h) h.moves = [];
      io.to(roomId).emit("restartGame");
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      const sessionId = socketToSession.get(socket.id);
      if (!sessionId) return;

      const roomId = sessionToRoom.get(sessionId);
      if (!roomId) return;

      console.log(`Session ${sessionId} disconnected.`);

      socket.to(roomId).emit("opponentLeft");
      sessionToRoom.delete(sessionId);
      const room = io.sockets.adapter.rooms.get(roomId);

      if (!room || room.size === 0) {
        console.log("Deleting empty room:", roomId);
        gameHistories.delete(roomId);
      }
    });
  });
};
