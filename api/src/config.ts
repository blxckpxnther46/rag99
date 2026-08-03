import "dotenv/config";
import { z } from "zod";

const env = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  AI_BASE_URL: z.string().url(),
  AI_API_KEY: z.string().min(1),
  AI_CHAT_MODEL: z.string().min(1),
  AI_EMBEDDING_MODEL: z.string().min(1),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(1536),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(60),
}).parse(process.env);

export default env;
