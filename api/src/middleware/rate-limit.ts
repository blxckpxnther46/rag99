import type { RequestHandler } from "express";
import env from "../config.js";
import { AppError } from "../http/errors.js";

const hits = new Map<string, { count: number; reset: number }>();

// ponytail: process-local limiter; use Redis when multiple API instances are deployed.
export const rateLimit: RequestHandler = (req, _res, next) => {
  const now = Date.now();
  const key = req.ip ?? "unknown";
  const current = hits.get(key);

  if (!current || current.reset <= now) {
    hits.set(key, {
      count: 1,
      reset: now + env.RATE_LIMIT_WINDOW_MS,
    });
  } else if (current.count + 1 > env.RATE_LIMIT_MAX_REQUESTS) {
    return next(new AppError(429, "Too many requests"));
  } else {
    current.count += 1;
  }

  next();
};
