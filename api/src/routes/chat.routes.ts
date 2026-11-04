/**
 * ─────────────────────────────────────────────────────────────
 * CONCEPTS IMPLEMENTED IN THIS FILE:
 * @concept MongoDB CRUD Operations (Update ratings, Delete chat telemetry, Aggregate retrieval)
 * @concept Polyglot Persistence Architecture (Postgres for documents/vectors vs Mongo for telemetry)
 * @concept Prompt Injection Awareness & Defenses (sanitizePrompt input inspection)
 * ─────────────────────────────────────────────────────────────
 */
import { Router } from "express";
import { asyncHandler } from "../http/async-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { chatParamsSchema, messageSchema, titleSchema } from "../schemas.js";
import * as chats from "../services/chat.service.js";
import * as messages from "../services/message.service.js";
import * as documents from "../services/document.service.js";
import { MongoChatMessage, getChatAnalyticsPipeline } from "../db/mongo.js";
import { sanitizePrompt } from "../middleware/sanitization.js";
import multer from "multer";
import env from "../config.js";
import { AppError } from "../http/errors.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const result = await chats.listChats(req.user!.id);
  res.json(result);
}));

router.post("/", asyncHandler(async (req, res) => {
  const result = await chats.createChat(req.user!.id, req.body.title);
  res.status(201).json(result);
}));

router.get("/:chatId", asyncHandler(async (req, res) => {
  const { chatId } = chatParamsSchema.parse(req.params);
  const result = await chats.getChat(req.user!.id, chatId);
  res.json(result);
}));

router.patch("/:chatId", asyncHandler(async (req, res) => {
  const { chatId } = chatParamsSchema.parse(req.params);
  const { title } = titleSchema.parse(req.body);
  const result = await chats.renameChat(req.user!.id, chatId, title);
  res.json(result);
}));

/**
 * ─────────────────────────────────────────────────────────────
 * Polyglot Persistence & MongoDB CRUD (DELETE)
 * ─────────────────────────────────────────────────────────────
 * 1. PostgreSQL handles transactional cascade deletion of relational
 *    records: DocumentChunks, Documents, Messages, and Chat.
 * 2. MongoDB CRUD DELETE: `deleteMany({ chatId })` purges non-relational
 *    telemetry, evaluation logs, and embedded citations for that chat.
 * ─────────────────────────────────────────────────────────────
 */
router.delete("/:chatId", asyncHandler(async (req, res) => {
  const { chatId } = chatParamsSchema.parse(req.params);
  // Relational deletion in PostgreSQL
  await chats.deleteChat(req.user!.id, chatId);
  // MongoDB CRUD: DELETE operation on NoSQL telemetry collection
  MongoChatMessage.deleteMany({ chatId }).catch(() => {});
  res.status(204).send();
}));

/**
 * ─────────────────────────────────────────────────────────────
 * MongoDB CRUD (RETRIEVE via Aggregation Pipeline)
 * ─────────────────────────────────────────────────────────────
 * Reads and computes statistics ($match, $group, $project, $sort)
 * across stored conversation turns and LLM evaluation telemetry.
 * ─────────────────────────────────────────────────────────────
 */
router.get("/:chatId/analytics", asyncHandler(async (req, res) => {
  const { chatId } = chatParamsSchema.parse(req.params);
  await chats.ownedChat(req.user!.id, chatId);
  // MongoDB CRUD: Complex RETRIEVE pipeline
  const stats = await getChatAnalyticsPipeline(chatId);
  res.json(stats);
}));

router.get("/:chatId/messages", asyncHandler(async (req, res) => {
  const { chatId } = chatParamsSchema.parse(req.params);
  const result = await messages.listMessages(req.user!.id, chatId);
  res.json(result);
}));

/**
 * ─────────────────────────────────────────────────────────────
 * Prompt Injection Awareness & Defenses
 * ─────────────────────────────────────────────────────────────
 * Incoming content is passed through `sanitizePrompt` before hitting
 * the vector retrieval or LLM synthesis pipelines.
 * ─────────────────────────────────────────────────────────────
 */
router.post("/:chatId/messages", asyncHandler(async (req, res) => {
  const { chatId } = chatParamsSchema.parse(req.params);
  const { content, mode } = messageSchema.parse(req.body);
  
  // Prompt Injection Awareness: regex signature detection & token strip
  const { sanitized, hasInjectionRisk } = sanitizePrompt(content);
  if (hasInjectionRisk) {
    console.warn("[Security] Potential prompt injection detected in chat:", chatId);
  }
  
  const result = await messages.ask(req.user!.id, chatId, sanitized, mode);
  res.status(201).json(result);
}));

/**
 * ─────────────────────────────────────────────────────────────
 * MongoDB CRUD (UPDATE)
 * ─────────────────────────────────────────────────────────────
 * - Executes `updateOne` using `$set: { rating }` by messageId or _id.
 * - Modifies user feedback ("up" or "down") without rewriting the document.
 * ─────────────────────────────────────────────────────────────
 */
router.patch("/:chatId/messages/:messageId/rating", asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;
  const { rating } = req.body;
  console.log(`[Rating Update] Received rating "${rating}" for message ${messageId} in chat ${chatId}`);

  // MongoDB CRUD: UPDATE operation on ChatMessage document
  let updateRes = await MongoChatMessage.updateOne(
    { $or: [{ messageId }, { _id: messageId }] },
    { $set: { rating: rating || "" } }
  ).catch((err) => {
    console.error("[Rating Update] MongoDB update error:", err);
    return null;
  });

  // Fallback: If client messageId differs, update the latest ASSISTANT message in this chat
  if (!updateRes || updateRes.matchedCount === 0) {
    const latestAssistant = await MongoChatMessage.findOne({ chatId, role: "ASSISTANT" }).sort({ createdAt: -1 });
    if (latestAssistant) {
      updateRes = await MongoChatMessage.updateOne(
        { _id: latestAssistant._id },
        { $set: { rating: rating || "" } }
      );
    }
  }

  console.log(`[Rating Update] Matched: ${updateRes?.matchedCount}, Modified: ${updateRes?.modifiedCount}`);
  res.json({ success: true, messageId, rating, matched: updateRes?.matchedCount });
}));

const allowedMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, allowedMimeTypes.has(file.mimetype));
  },
});

router.get("/:chatId/documents", asyncHandler(async (req, res) => {
  const { chatId } = chatParamsSchema.parse(req.params);
  const result = await documents.listDocuments(req.user!.id, chatId);
  res.json(result);
}));

/**
 * ─────────────────────────────────────────────────────────────
 * Document Upload Storage (PostgreSQL vs MongoDB)
 * ─────────────────────────────────────────────────────────────
 * - Uploads are processed into PostgreSQL (`Document` and `DocumentChunk`),
 *   NOT MongoDB. Binary files are stored in Cloudinary / cloud storage.
 * - Chunks are vectorized and indexed with PostgreSQL pgvector.
 * ─────────────────────────────────────────────────────────────
 */
router.post(
  "/:chatId/documents",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { chatId } = chatParamsSchema.parse(req.params);

    if (!req.file) {
      throw new AppError(400, "One supported file is required");
    }

    // Stores document records & triggers vector chunking in PostgreSQL
    const result = await documents.addDocument(req.user!.id, chatId, req.file);
    res.status(201).json(result);
  }),
);

export default router;
