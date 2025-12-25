import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { createGame, getGameHistory, getGameMoves, joinGame } from "../controllers/gameController";

const router = Router();

router.post("/create", authMiddleware, createGame);

router.post("/join", authMiddleware, joinGame);

router.get("/:gameId/moves", authMiddleware, getGameMoves);

router.get("/history", authMiddleware, getGameHistory);




export default router;
