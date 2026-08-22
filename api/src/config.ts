import "dotenv/config";
import { z } from "zod";

const env = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  AI_BASE_URL: z.string().url(),
  AI_API_KEY: z.string().min(1),
  AI_CHAT_MODEL: z.string().min(1),
  AI_EMBEDDING_MODEL: z.string().min(1),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(1024),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(60),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY1: z.string().min(1).optional(),
  OPENROUTER_API_KEY2: z.string().min(1).optional(),
  OPENROUTER_API_KEY3: z.string().min(1).optional(),
}).parse(process.env);

export default env;

