import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { createGame, joinGame } from "../controllers/gameController";

const router = Router();

router.post("/create", authMiddleware, createGame);

router.post("/join", authMiddleware, joinGame);


export default router;
