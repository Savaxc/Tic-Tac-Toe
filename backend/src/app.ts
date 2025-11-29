import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import gameRoutes from "./routes/gameRoutes";
import { pool } from "./config/db";

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/game", gameRoutes);

app.get("/", (req, res) => {
  res.send("Backend OK!");
});
