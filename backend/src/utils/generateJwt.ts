import jwt from "jsonwebtoken";

export const generateJwt = (id: number, username: string) => {
  return jwt.sign({ id, username }, process.env.JWT_SECRET!, { expiresIn: "15m" });
};
