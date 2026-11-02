import mongoose, { Schema } from "mongoose";
import env from "../config.js";

/* ─────────────────────────────────────────────────────────
 * POLYGLOT PERSISTENCE — MongoDB NoSQL Document Store
 *
 * Demonstrates:
 * 1. EMBEDDING vs REFERENCING relationships in NoSQL
 * 2. MongoDB AGGREGATION PIPELINES ($match, $group, $project, $sort)
 * 3. Semi-structured conversation history and latency telemetry
 * ───────────────────────────────────────────────────────── */

// =========================================================
// 1. EMBEDDED RELATIONSHIPS (Subdocuments)
// Use case: 1-to-few, bounded data that is frequently retrieved
// with parent and doesn't need to exist independently.
// =========================================================

// Embedded Subdocument: Citation Schema (Embedded inside ChatMessage)
export const CitationSubSchema = new Schema(
  {
    source: { type: String, required: true },
    chunk: { type: Number, required: true },
    content: { type: String, default: "" },
  },
  { _id: false }
);

// Embedded Subdocument: Execution Telemetry (Embedded inside ChatMessage)
export const RagTelemetrySubSchema = new Schema(
  {
    embedDurationMs: { type: Number, default: 0 },
    retrievalDurationMs: { type: Number, default: 0 },
    llmDurationMs: { type: Number, default: 0 },
    totalLatencyMs: { type: Number, default: 0 },
    providerUsed: { type: String, default: "unknown" },
    retrievedChunkCount: { type: Number, default: 0 },
    // Token & Cost Monitoring
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    estimatedCostUsd: { type: Number, default: 0 },
  },
  { _id: false }
);

// Main Chat Message Document featuring Embedded Subdocuments
export const ChatMessageDocSchema = new Schema(
  {
    messageId: { type: String, index: true }, // Cross-reference to PostgreSQL Message.id
    chatId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["USER", "ASSISTANT"], required: true },
    content: { type: String, required: true },
    // EMBEDDING: Citations stored directly in parent document
    citations: [CitationSubSchema],
    rating: { type: String, enum: ["up", "down", ""], default: "" },
    // EMBEDDING: Latency telemetry stored directly in parent document
    telemetry: RagTelemetrySubSchema,
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "chat_messages", timestamps: true }
);

export const MongoChatMessage =
  mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", ChatMessageDocSchema);

// =========================================================
// 2. REFERENCING RELATIONSHIPS (Normalized Document Links)
// Use case: 1-to-many, independent lifecycle, avoiding document
// size limit (16MB), or avoiding deep embedding.
// =========================================================

export const ChatSessionMetaSchema = new Schema(
  {
    chatId: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: "New chat" },
    // REFERENCING: normalized reference pointing to ChatMessage by ObjectId
    lastMessageRef: { type: Schema.Types.ObjectId, ref: "ChatMessage" },
    pinnedMessages: [{ type: Schema.Types.ObjectId, ref: "ChatMessage" }],
    category: { type: String, default: "general" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: "chat_sessions", timestamps: true }
);

export const MongoChatSession =
  mongoose.models.ChatSession ||
  mongoose.model("ChatSession", ChatSessionMetaSchema);

/**
 * Demonstrate Referencing query: resolves references using .populate()
 */
export async function getChatWithPopulatedReferences(chatId: string) {
  try {
    if (!isConnected && env.MONGODB_URI) await connectMongo();
    if (!isConnected) return null;

    return await MongoChatSession.findOne({ chatId })
      .populate("lastMessageRef")
      .populate("pinnedMessages")
      .exec();
  } catch (err) {
    console.warn("[MongoDB] Error populating referenced documents:", (err as Error).message);
    return null;
  }
}

// =========================================================
// 3. AGGREGATION PIPELINES ($match, $group, $project, $sort)
// =========================================================

/**
 * Executes a MongoDB Aggregation Pipeline on conversational telemetry.
 * Stages:
 *  1. $match: Filters records by chatId
 *  2. $group: Computes average latencies and feedback totals
 *  3. $project: Reshapes and rounds computed statistics
 *  4. $sort: Sorts output
 */
export async function getChatAnalyticsPipeline(chatId: string) {
  try {
    if (!isConnected && env.MONGODB_URI) await connectMongo();
    if (!isConnected) return [];

    const stats = await MongoChatMessage.aggregate([
      // Stage 1: $match
      {
        $match: {
          chatId,
          role: "ASSISTANT",
        },
      },
      // Stage 2: $group
      {
        $group: {
          _id: "$chatId",
          totalResponses: { $sum: 1 },
          avgEmbedDurationMs: { $avg: "$telemetry.embedDurationMs" },
          avgRetrievalDurationMs: { $avg: "$telemetry.retrievalDurationMs" },
          avgLlmDurationMs: { $avg: "$telemetry.llmDurationMs" },
          avgTotalLatencyMs: { $avg: "$telemetry.totalLatencyMs" },
          upvotes: {
            $sum: { $cond: [{ $eq: ["$rating", "up"] }, 1, 0] },
          },
          downvotes: {
            $sum: { $cond: [{ $eq: ["$rating", "down"] }, 1, 0] },
          },
        },
      },
      // Stage 3: $project
      {
        $project: {
          _id: 0,
          chatId: "$_id",
          totalResponses: 1,
          avgEmbedDurationMs: { $round: ["$avgEmbedDurationMs", 2] },
          avgRetrievalDurationMs: { $round: ["$avgRetrievalDurationMs", 2] },
          avgLlmDurationMs: { $round: ["$avgLlmDurationMs", 2] },
          avgTotalLatencyMs: { $round: ["$avgTotalLatencyMs", 2] },
          upvotes: 1,
          downvotes: 1,
        },
      },
      // Stage 4: $sort
      {
        $sort: { totalResponses: -1 },
      },
    ]);

    return stats;
  } catch (err) {
    console.warn("[MongoDB] Error executing aggregation pipeline:", (err as Error).message);
    return [];
  }
}

// =========================================================
// 4. Connection & Core CRUD Helpers
// =========================================================

let isConnected = false;

export async function connectMongo(): Promise<boolean> {
  if (isConnected) return true;
  if (!env.MONGODB_URI) return false;

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
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    estimatedCostUsd?: number;
  };
}) {
  try {
    if (!isConnected && env.MONGODB_URI) {
      await connectMongo();
    }
    if (!isConnected) return null;

    const message = await MongoChatMessage.create({
      messageId: data.messageId,
      chatId: data.chatId,
      userId: data.userId,
      role: data.role,
      content: data.content,
      citations: data.citations || [],
      telemetry: data.telemetry,
    });

    // Update referencing relationship in ChatSession
    await MongoChatSession.findOneAndUpdate(
      { chatId: data.chatId },
      {
        $set: { lastMessageRef: message._id },
        $setOnInsert: { title: "Chat session" },
      },
      { upsert: true }
    ).catch(() => {});

    return message;
  } catch (err) {
    console.warn("[MongoDB] Failed to log chat message to MongoDB:", (err as Error).message);
    return null;
  }
}
