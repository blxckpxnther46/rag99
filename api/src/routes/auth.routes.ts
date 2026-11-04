/**
 * ─────────────────────────────────────────────────────────────
 * @concept JavaScript — Event loop
 * ─────────────────────────────────────────────────────────────
 * HOW THE EVENT LOOP HANDLES AUTHENTICATION:
 * 1. Synchronous Call Stack Phase:
 *    - Request arrives at Express route handler.
 *    - `authSchema.parse(req.body)` runs synchronously on the V8 Call Stack.
 *      If validation fails, Zod throws immediately without yielding.
 * 2. Asynchronous Yielding & Libuv:
 *    - `await service.register(input)` invokes the async registration service.
 *    - Asynchronous DB operations (Prisma) and bcrypt hashing are delegated
 *      to Libuv I/O polling and worker threads.
 *    - The router function yields the Call Stack back to Node.js, allowing
 *      other concurrent incoming HTTP requests to be handled without blocking.
 * 3. Microtask Queue Resolution:
 *    - Once database insertion completes, the Promise resolution is queued
 *      in the Microtask Queue.
 *    - Node's event loop executes microtasks ahead of any macrotask, resuming
 *      execution right after `await` to send `res.status(201).json(result)`.
 * ─────────────────────────────────────────────────────────────
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../http/async-handler.js";
import { authSchema, loginSchema } from "../schemas.js";
import * as service from "../services/auth.service.js";

const router = Router();

// Endpoint: POST /register
// Wrapped by asyncHandler to forward any rejected Promise from the microtask queue to Express error middleware
router.post("/register", asyncHandler(async (req, res) => {
  // Step 1: Call Stack — Synchronous validation
  const input = authSchema.parse(req.body);

  // Step 2: Event Loop — Async delegation (DB queries + password hashing)
  // Call stack yields while waiting for Promise to settle
  const result = await service.register(input);

  // Step 3: Microtask Queue — Handler resumes upon Promise resolution
  res.status(201).json(result);
}));

router.post("/login", asyncHandler(async (req, res) => {
  // Call stack validates credentials schema synchronously
  const input = loginSchema.parse(req.body);
  // Async delegation to auth service
  const result = await service.login(input);
  res.json(result);
}));

router.post("/google", asyncHandler(async (req, res) => {
  // Call stack parses token credential payload
  const { credential } = z.object({ credential: z.string().min(1) }).parse(req.body);
  // Async verification with Google API via Libuv network I/O
  const result = await service.loginWithGoogle(credential);
  res.json(result);
}));

export default router;
