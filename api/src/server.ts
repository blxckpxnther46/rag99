import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { app } from "./app.js";
import env from "./config.js";
import { connectMongo } from "./db/mongo.js";
import { setupScheduledJobs } from "./jobs/cron.js";

/**
 * ─────────────────────────────────────────────────────────────
 * @concept Environment variables & secrets management
 * ─────────────────────────────────────────────────────────────
 * Server runtime initialization:
 * - Bootstraps environment variables via `dotenv.config()`.
 * - Resolves dynamic port binding from `process.env.PORT` (injected by host platform like Render).
 * - Enforces fallback to validated `env.PORT` or default 4000.
 * ─────────────────────────────────────────────────────────────
 */
const PORT = process.env.PORT || env.PORT || 4000;

// Polyglot Persistence: initialize MongoDB connection if configured
if (env.MONGODB_URI) {
  connectMongo().catch(() => {});
}

// Initialize Scheduled jobs / cron
setupScheduledJobs();

// Create HTTP Server
const server = http.createServer(app);

/**
 * ─────────────────────────────────────────────────────────────
 * WebSocket / Real-Time Communication
 * ─────────────────────────────────────────────────────────────
 * Provides bidirectional real-time communication for live document
 * ingestion progress and streaming AI status updates.
 */
export const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket) => {
  ws.send(
    JSON.stringify({
      type: "connected",
      message: "WebSocket connection established for real-time events",
    })
  );

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      }
    } catch {}
  });
});

/**
 * ─────────────────────────────────────────────────────────────
 * BACKEND DEPLOYMENT & PORT BINDING:
 * - Binds the HTTP and WebSocket servers to PORT.
 * - In local development: defaults to 4000.
 * - In Render deployment: Render dynamically injects process.env.PORT.
 * ─────────────────────────────────────────────────────────────
 */
server.listen(PORT, () => {
  console.log(`rag99 api listening on http://localhost:${PORT}`);
});
