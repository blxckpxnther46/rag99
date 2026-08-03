import type { ErrorRequestHandler } from "express";
import { errorResponse } from "../http/errors.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const result = errorResponse(error);
  res.status(result.status).json(result.body);
};
