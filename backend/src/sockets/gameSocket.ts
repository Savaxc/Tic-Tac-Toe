import { Server } from "socket.io";

export const initGameSocket = (io: Server) => {
  io.on("connection", (socket) => {

    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
    });

    socket.on("playerMove", ({ roomId, board }) => {
      socket.to(roomId).emit("opponentMove", board);
    });

    socket.on("gameOver", ({ roomId, winner }) => {
      io.to(roomId).emit("gameFinished", winner);
    });
  });
};
