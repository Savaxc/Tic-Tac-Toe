import { Server } from "socket.io";

export const initGameSocket = (io: Server) => {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // CREATE ROOM
    socket.on("createRoom", (roomId: string) => {
      const room = io.sockets.adapter.rooms.get(roomId);

      // Ne dozvoli duplikat sobe
      if (room) {
        socket.emit("roomAlreadyExists");
        return;
      }

      // Kreiranje sobe
      socket.join(roomId);
      console.log(`Room created: ${roomId} by ${socket.id}`);

      // Prvi igrac je uvek X
      socket.emit("assignSymbol", "X");
    });

    // JOIN ROOM
    socket.on("joinRoom", (roomId: string) => {
      const room = io.sockets.adapter.rooms.get(roomId);

      if (!room) {
        socket.emit("roomNotFound");
        return;
      }

      // room size check
      if (room.size >= 2) {
        socket.emit("roomFull");
        return;
      }

      socket.join(roomId);
      console.log(`Player joined room: ${roomId}`);

      const size = room.size;

      if (size === 1) {
        // prvi igrac je X — vec dodeljen
        socket.emit("assignSymbol", "X");
      } else if (size === 2) {
        // drugi igrac → O
        socket.emit("assignSymbol", "O");

        socket.to(roomId).emit("opponentConnected");
      }
    });

    // PLAYER MOVE
    socket.on("playerMove", ({ roomId, board }) => {
      socket.to(roomId).emit("opponentMove", board);
    });

    // GAME FINISHED
    socket.on("gameOver", ({ roomId, winner }) => {
      io.to(roomId).emit("gameFinished", winner);
    });

    // RESTART GAME
    socket.on("restartGame", ({ roomId }) => {
      io.to(roomId).emit("restartGame");
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
