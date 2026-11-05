/**
 * ─────────────────────────────────────────────────────────────
 * @concept JavaScript — Event loop
 * ─────────────────────────────────────────────────────────────
 * Call Stack, Libuv, and Microtask Queue Architecture:
 *
 * 1. CALL STACK:
 *    - The single-threaded V8 execution context runs JavaScript functions synchronously.
 *    - Synchronous checks, object creation, and `jwt.sign()` run directly on the Call Stack.
 * 2. LIBUV ASYNCHRONOUS I/O & THREAD POOL:
 *    - Network operations (Prisma database queries over PostgreSQL TCP socket) are offloaded
 *      to Libuv's non-blocking I/O event demultiplexer (epoll/kqueue/IOCP).
 *    - Heavy CPU computations (`bcrypt.hash` with 12 salt rounds) are offloaded to
 *      Libuv's internal worker thread pool (`UV_THREADPOOL_SIZE`), so the single main
 *      thread is never blocked from accepting new HTTP connections.
 * 3. MICROTASK QUEUE (PROMISE JOBS):
 *    - When `await prisma.user.create()` or `await bcrypt.hash()` finishes, the
 *      resolution continuation is pushed to the Microtask Queue (NOT the Macrotask Queue).
 *    - Microtask queue has strict execution priority: between every tick of the event
 *      loop and whenever the Call Stack empties, the microtask queue is drained completely
 *      before any timer (`setTimeout`) or I/O macrotask is processed.
 * 4. TOKEN GENERATION:
 *    - `jwt.sign()` is a synchronous operation executed entirely on the Call Stack.
 *      Because it uses fast HMAC-SHA256 in memory without disk or network I/O, it
 *      completes in sub-millisecond time and returns the token payload immediately.
 * ─────────────────────────────────────────────────────────────
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { prisma } from "../db/prisma.js";
import env from "../config.js";
import { AppError } from "../http/errors.js";

type AuthInput = {
  email: string;
  password: string;
  name?: string;
};

/**
 * @concept JavaScript — Event loop
 * Demonstrates Call Stack execution, Libuv threadpool offloading, and Microtask queue resolution.
 */
export async function register(input: AuthInput) {
  // Step 1: Call Stack pushes prisma.user.findUnique call.
  // Step 2: Libuv handles non-blocking TCP socket communication with PostgreSQL.
  // The 'register' function yields execution; the Call Stack is free for other requests.
  const exists = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // Step 3: Microtask Queue drains when Postgres returns data; execution resumes on Call Stack.
  if (exists) {
    throw new AppError(409, "Email already registered");
  }

  // Step 4: Libuv Thread Pool offloads bcrypt salt generation & key stretching (12 rounds)
  // to prevent blocking Node's main thread.
  const passwordHash = await bcrypt.hash(input.password, 12);

  // Step 5: Database Insertion:
  // Asynchronous query sent over TCP socket via Libuv.
  // Once the PostgreSQL engine commits the row, the Promise resolves and queues
  // its continuation into the Microtask Queue.
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name ?? "User",
      passwordHash,
    },
  });

  // Step 6: Token Generation executed synchronously on Call Stack via createTokenResponse
  return createTokenResponse(user);
}

export async function login(input: Pick<AuthInput, "email" | "password">) {
  // Call stack yields while Libuv queries Postgres
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // Libuv threadpool evaluates bcrypt.compare hash matching
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, "Invalid credentials");
  }

  // Synchronous token generation on Call Stack
  return createTokenResponse(user);
}

/**
 * TOKEN GENERATION LOGIC:
 * Runs synchronously on the V8 Call Stack.
 * Uses jwt.sign with env.JWT_SECRET and HMAC-SHA256.
 * Because no disk/network I/O is involved, this is non-blocking and executes in nanoseconds.
 */
function createTokenResponse(user: { id: string; email: string; name: string }) {
  // Call Stack: Computes JWT signature synchronously
  const token = jwt.sign(
    { id: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

/**
 * @concept OAuth / 3rd-party login (Federated identity via Google Identity Services)
 * @concept 3rd-party API integration (Server-to-server token verification against Google OAuth2 API)
 *
 * 1. Third-Party Verification:
 *    - Makes HTTPS GET to https://oauth2.googleapis.com/tokeninfo?id_token=${credential}
 *    - Validates audience (aud === env.GOOGLE_CLIENT_ID) to prevent Cross-Client Token Forgery.
 *    - Verifies email_verified claim before trusting user identity.
 * 2. Account Provisioning & Session:
 *    - Finds existing user by email or provisions a new user record with Prisma in PostgreSQL.
 *    - Issues our own signed JWT (HMAC-SHA256) for stateful/sessionless authentication.
 */
export async function loginWithGoogle(credential: string) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(500, "Google OAuth is not configured on this server.");
  }

  // Libuv non-blocking HTTPS fetch to Google tokeninfo endpoint
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
  if (!res.ok) {
    throw new AppError(401, "Invalid Google credential");
  }

  const payload = await res.json() as any;
  if (payload.aud !== env.GOOGLE_CLIENT_ID) {
    throw new AppError(401, "Google client ID mismatch");
  }

  if (payload.email_verified !== "true" && payload.email_verified !== true) {
    throw new AppError(401, "Google email not verified");
  }

  const email = String(payload.email);
  const name = String(payload.name ?? "Google User");

  // Libuv DB query
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
      },
    });
  }

  // Call stack token response
  return createTokenResponse(user);
}
