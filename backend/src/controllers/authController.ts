import { Request, Response } from "express";
import { pool } from "../config/db";
import { hashPassword, comparePassword } from "../utils/passwordUtils";
import { generateJwt } from "../utils/generateJwt";

interface PgError extends Error {
  code?: string;
}

export const register = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const hashed = await hashPassword(password);

    const result = await pool.query(
      "INSERT INTO users(username, password) VALUES($1,$2) RETURNING id",
      [username, hashed]
    );

    return res.json({ token: generateJwt(result.rows[0].id, username) });

  } catch (error) {
      const err = error as PgError;
      
      // PostgreSQL Code '23505' (UNIQUE VIOLATION)
      if (err.code === '23505') {
        return res.status(409).json({ message: "The username is taken. Please choose another one." });
      }

      // Neka druga greska (npr. problem sa konekcijom, nepoznata tabela)
      console.error("User registration error:", err);
      return res.status(500).json({ message: "Server error." });
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT id, username, password FROM users WHERE username=$1", 
      [username]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "User not found" });

    const user = result.rows[0];
    const valid = await comparePassword(password, user.password);

    if (!valid) return res.status(400).json({ message: "Wrong password" });
      return res.json({ status: "Success", token: generateJwt(user.id, user.username) });
  } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "A server error occurred during login." });
    }
};