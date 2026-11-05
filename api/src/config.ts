import dotenv from "dotenv";
import { z } from "zod";

/**
 * ─────────────────────────────────────────────────────────────
 * @concept Environment variables & secrets management
 * ─────────────────────────────────────────────────────────────
 * Enforces strict schema validation for environment configurations
 * and runtime secrets at boot time using Zod:
 * - Bootstraps runtime environment via `dotenv.config()`.
 * - Guarantees fail-fast behavior if secrets (JWT_SECRET, DATABASE_URL)
 *   are missing or do not meet minimum entropy requirements (>= 32 chars).
 * - Centralizes typed access across the application.
 * - Protects secrets from exposure to client bundles.
 * ─────────────────────────────────────────────────────────────
 */

// Initialize dotenv environment configuration
dotenv.config();

export const envSchema = z.object({
  // Database Secrets
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  
  // Security & Authentication Secrets
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters for security"),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  
  // AI Provider Credentials & Configuration
  AI_BASE_URL: z.string().url("AI_BASE_URL must be a valid URL").default("https://openrouter.ai/api/v1"),
  AI_API_KEY: z.string().min(1, "AI_API_KEY is required"),
  AI_CHAT_MODEL: z.string().min(1).default("meta-llama/llama-3.3-70b-instruct"),
  AI_EMBEDDING_MODEL: z.string().min(1).default("openai/text-embedding-3-small"),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(1024),
  GROQ_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY1: z.string().min(1).optional(),
  OPENROUTER_API_KEY2: z.string().min(1).optional(),
  OPENROUTER_API_KEY3: z.string().min(1).optional(),
  
  // Cloudinary Storage Secrets
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  
  // Distributed Cache & Polyglot NoSQL Connection Secrets
  REDIS_URL: z.string().min(1).optional(),
  MONGO_URI: z.string().min(1).optional(),
  MONGODB_URI: z.string().min(1).optional(),
  
  // Server Configuration
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(60),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and sanitizes loaded environment secrets
 */
export function validateSecrets(): { valid: boolean; loadedCount: number } {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("[Secrets] Validation failed:", result.error.format());
    return { valid: false, loadedCount: 0 };
  }
  return { valid: true, loadedCount: Object.keys(result.data).length };
}

const parsedEnv = envSchema.parse(process.env);

// Normalize MONGO_URI and MONGODB_URI
if (!parsedEnv.MONGODB_URI && parsedEnv.MONGO_URI) {
  parsedEnv.MONGODB_URI = parsedEnv.MONGO_URI;
}

const env = parsedEnv;

export default env;
