import mongoose, { Schema } from "mongoose";
import env from "../config.js";

/* ─────────────────────────────────────────────────────────
 * POLYGLOT PERSISTENCE — MongoDB NoSQL Document Store
 *
 * Used alongside PostgreSQL + pgvector for:
 * 1. Semi-structured chat message history and user ratings
 * 2. RAG latency & token telemetry audit logs
 * ───────────────────────────────────────────────────────── */

// 1. Embedded Subdocument: Citation Schema
const CitationSubSchema = new Schema(
  {
    source: { type: String, required: true },
    chunk: { type: Number, required: true },
    content: { type: String, default: "" },
  },
  { _id: false }
);

// 2. Embedded Subdocument: RAG Query Telemetry Schema
const RagTelemetrySubSchema = new Schema(
  {
    embedDurationMs: { type: Number },
    retrievalDurationMs: { type: Number },
    llmDurationMs: { type: Number },
    totalLatencyMs: { type: Number },
    providerUsed: { type: String, default: "unknown" },
    retrievedChunkCount: { type: Number, default: 0 },
  },
  { _id: false }
);

// 3. Main Chat Message & Feedback Audit Document
const ChatMessageDocSchema = new Schema(
  {
    messageId: { type: String, index: true }, // Prisma/PostgreSQL Message ID for cross-linking
    chatId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["USER", "ASSISTANT"], required: true },
    content: { type: String, required: true },
    citations: [CitationSubSchema], // Embedded subdocument array
    rating: { type: String, enum: ["up", "down", ""], default: "" }, // Feedback
    telemetry: RagTelemetrySubSchema, // Embedded audit telemetry
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "chat_messages" }
);

export const MongoChatMessage =
  mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", ChatMessageDocSchema);

let isConnected = false;

/**
 * Initialize MongoDB connection gracefully.
 * Never crashes the application if MongoDB is unconfigured or unavailable.
 */
export async function connectMongo(): Promise<boolean> {
  if (isConnected) return true;
  if (!env.MONGODB_URI) {
    return false;
  }

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log("[MongoDB] Connected to NoSQL Document Database successfully.");
    return true;
  } catch (error) {
    console.warn(
      "[MongoDB] Notice: Could not connect to MongoDB URI. Polyglot audit logging will run in fail-safe bypass mode:",
      (error as Error).message
    );
    return false;
  }
}

/**
 * Log a chat message and execution telemetry into MongoDB.
 * Fail-safe wrapper that guarantees primary PostgreSQL flow is never blocked.
 */
export async function logMongoMessage(data: {
  messageId?: string;
  chatId: string;
  userId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: Array<{ source: string; chunk: number; content?: string }>;
  telemetry?: {
    embedDurationMs?: number;
    retrievalDurationMs?: number;
    llmDurationMs?: number;
    totalLatencyMs?: number;
    providerUsed?: string;
    retrievedChunkCount?: number;
  };
}) {
  try {
    if (!isConnected && env.MONGODB_URI) {
      await connectMongo();
    }
    if (!isConnected) return null;

    return await MongoChatMessage.create({
      messageId: data.messageId,
      chatId: data.chatId,
      userId: data.userId,
      role: data.role,
      content: data.content,
      citations: data.citations || [],
      telemetry: data.telemetry,
    });
  } catch (err) {
    console.warn("[MongoDB] Failed to log chat message to MongoDB:", (err as Error).message);
    return null;
  }
}
