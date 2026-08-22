import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../http/async-handler.js";
import { authSchema, loginSchema } from "../schemas.js";
import * as service from "../services/auth.service.js";

const router = Router();

router.post("/register", asyncHandler(async (req, res) => {
  const input = authSchema.parse(req.body);
  const result = await service.register(input);
  res.status(201).json(result);
}));

router.post("/login", asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const result = await service.login(input);
  res.json(result);
}));

router.post("/google", asyncHandler(async (req, res) => {
  const { credential } = z.object({ credential: z.string().min(1) }).parse(req.body);
  const result = await service.loginWithGoogle(credential);
  res.json(result);
}));

export default router;

