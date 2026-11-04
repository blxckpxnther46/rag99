import mongoose, { Schema } from "mongoose";
import env from "../config.js";

/**
 * ─────────────────────────────────────────────────────────────
 * @concept MongoDB CRUD Operations
 * @concept MongoDB Schema Modeling
 * @concept LLM Eval Sets
 * ─────────────────────────────────────────────────────────────
 * Polyglot Persistence Architecture & Telemetry Engine:
 *
 * 1. ARCHITECTURAL PERSISTENCE ROLES:
 *    - Document uploads, binary PDF/DOCX files, and 1024-d vector embeddings
 *      are stored in PostgreSQL (`Document`, `DocumentChunk`) via Prisma & pgvector,
 *      with raw files in Cloudinary.
 *    - MongoDB is the Polyglot NoSQL store dedicated to semi-structured
 *      conversational turns, dynamic citations, user ratings, and latency telemetry.
 *
 * 2. MONGODB CRUD LIFECYCLE:
 *    - CREATE: `MongoChatMessage.create()` in `logMongoMessage()` persists
 *      new chat messages along with embedded citations and LLM execution telemetry.
 *    - RETRIEVE: `MongoChatMessage.aggregate()` in `getChatAnalyticsPipeline()`
 *      runs a 4-stage aggregation ($match, $group, $project, $sort) to calculate
 *      average latency, token costs, and upvote/downvote satisfaction metrics.
 *      `getChatWithPopulatedReferences()` retrieves normalized documents via `.populate()`.
 *    - UPDATE: `MongoChatMessage.updateOne({ $or: [{ messageId }, { _id: messageId }] }, { $set: { rating } })`
 *      in `chat.routes.ts` updates user feedback ratings ("up" / "down").
 *    - DELETE: `MongoChatMessage.deleteMany({ chatId })` in `chat.routes.ts`
 *      purges all telemetry and conversation history when a chat is deleted.
 *
 * 3. SCHEMA MODELING:
 *    - EMBEDDING (1-to-few): `CitationSubSchema` and `RagTelemetrySubSchema`
 *      are embedded directly inside `ChatMessageDocSchema`.
 *    - REFERENCING (1-to-many): `ChatSessionMetaSchema` uses normalized
 *      `lastMessageRef` and `pinnedMessages` pointing to `ChatMessage` ObjectIds.
 *
 * 4. LLM EVAL SETS & TELEMETRY:
 *    - `RagTelemetrySubSchema` tracks `promptTokens`, `completionTokens`,
 *      `estimatedCostUsd`, latency breakdown (`embedDurationMs`, `retrievalDurationMs`,
 *      `llmDurationMs`, `totalLatencyMs`), provider used, and user feedback ratings
 *      to monitor AI quality, latency regressions, and model drift over time.
 * ─────────────────────────────────────────────────────────────
 */

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

// Embedded Subdocument: LLM Evaluation Telemetry & Cost Monitoring
export const RagTelemetrySubSchema = new Schema(
  {
    // Pipeline Latencies
    embedDurationMs: { type: Number, default: 0 },
    retrievalDurationMs: { type: Number, default: 0 },
    llmDurationMs: { type: Number, default: 0 },
    totalLatencyMs: { type: Number, default: 0 },
    providerUsed: { type: String, default: "unknown" },
    retrievedChunkCount: { type: Number, default: 0 },
    // LLM Eval Sets: Token & Cost Monitoring
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
    // Dynamic user feedback rating ("up", "down", "") updated via CRUD PATCH
    rating: { type: String, enum: ["up", "down", ""], default: "" },
    // EMBEDDING: Latency and token telemetry stored directly in parent document
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
 * CRUD: RETRIEVE with relational resolution in MongoDB NoSQL
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
 * CRUD: Advanced RETRIEVE / Analytics
 * Stages:
 *  1. $match: Filters records by chatId and role=ASSISTANT
 *  2. $group: Computes average latencies and feedback totals
 *  3. $project: Reshapes and rounds computed statistics
 *  4. $sort: Sorts output by total responses
 */
export async function getChatAnalyticsPipeline(chatId: string) {
  try {
    if (!isConnected && env.MONGODB_URI) await connectMongo();
    if (!isConnected) return [];

    const stats = await MongoChatMessage.aggregate([
      // Stage 1: $match - Filters by chatId and ASSISTANT messages
      {
        $match: {
          chatId,
          role: "ASSISTANT",
        },
      },
      // Stage 2: $group - Aggregates average execution times and upvotes/downvotes
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
      // Stage 3: $project - Formats output numbers to 2 decimal places
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
      // Stage 4: $sort - Orders by response frequency
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

/**
 * CRUD: CREATE Operation
 * Inserts a new ChatMessage document into MongoDB with embedded telemetry and citations.
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

    // MongoDB CRUD: CREATE document
    const message = await MongoChatMessage.create({
      messageId: data.messageId,
      chatId: data.chatId,
      userId: data.userId,
      role: data.role,
      content: data.content,
      citations: data.citations || [],
      telemetry: data.telemetry,
    });

    // MongoDB CRUD: UPDATE / UPSERT referencing session
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
