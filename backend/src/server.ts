import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import { app } from "./app";
import { initGameSocket } from "./sockets/gameSocket";

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

initGameSocket(io);

server.listen(process.env.PORT, () => {
  console.log(`Backend running on port ${process.env.PORT}`);
});

