import { Server } from "socket.io";

export const initGameSocket = (io: Server) => {
  io.on("connection", (socket) => {
    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);

      const clients = io.sockets.adapter.rooms.get(roomId);
      const size = clients ? clients.size : 0;

      console.log("Clients in room", roomId, size);

      if (size === 1) {
        // prvi igrac → X
        socket.emit("assignSymbol", "X");
      } else if (size === 2) {
        // drugi igrac → O
        socket.emit("assignSymbol", "O");

        // obavesti prvog da je igra spremna
        socket.to(roomId).emit("opponentConnected");
      } else {
        socket.emit("roomFull");
      }
    });

    socket.on("playerMove", ({ roomId, board }) => {
      socket.to(roomId).emit("opponentMove", board);
    });

    socket.on("gameOver", ({ roomId, winner }) => {
      io.to(roomId).emit("gameFinished", winner);
    });

    socket.on("restartGame", ({ roomId }) => {
      io.to(roomId).emit("restartGame");
    });
  });
};
