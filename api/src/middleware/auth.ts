import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import env from "../config.js";
import { AppError } from "../http/errors.js";

export type AuthUser = { id: string; email: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return next(new AppError(401, "Authentication required"));
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
};
