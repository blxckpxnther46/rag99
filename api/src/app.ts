import express from "express";
import cors from "cors";
import env from "./config.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { errorHandler } from "./middleware/error.js";
import auth from "./routes/auth.routes.js";
import chats from "./routes/chat.routes.js";
import documents from "./routes/document.routes.js";

export const app = express();

const allowedOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (allowedOrigins.some((ao) => ao.includes("vercel.app") && origin.endsWith(".vercel.app"))) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use((req, _res, next) => {
  if (req.url.startsWith("//")) {
    req.url = req.url.replace(/^\/+/, "/");
  }
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", auth);
app.use("/api/chats", chats);
app.use("/api/documents", documents);

app.use(errorHandler);
