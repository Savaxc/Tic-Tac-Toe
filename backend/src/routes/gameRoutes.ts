import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { createGame } from "../controllers/gameController";

const router = Router();

router.post("/create", authMiddleware, createGame);

export default router;
