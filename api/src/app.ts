import express from "express";
import cors from "cors";
import env from "./config.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { errorHandler } from "./middleware/error.js";
import auth from "./routes/auth.routes.js";
import chats from "./routes/chat.routes.js";
import documents from "./routes/document.routes.js";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", auth);
app.use("/api/chats", chats);
app.use("/api/documents", documents);

app.use(errorHandler);
