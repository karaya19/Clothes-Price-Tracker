import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

type AppJwtPayload = {
  userId: string;
  name: string;
};

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(403)
      .json({ msg: "Invalid authorization header" });
  }

  const token = authHeader.split(" ")[1] as string;
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res
      .status(500)
      .json({ msg: "JWT_SECRET not set" });
  }

  try {
    const payload = jwt.verify(token, secret) as AppJwtPayload;

    req.user = {
      userId: payload.userId,
      name: payload.name,
    };
    console.log('Authenticated user: ' + JSON.stringify(req.user));
    next();
  } catch {
    return res
      .status(403)
      .json({ msg: "Invalid token" });
  }
};

export default authenticate;
