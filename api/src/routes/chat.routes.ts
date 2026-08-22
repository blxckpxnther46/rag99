import { Router } from "express";
import { asyncHandler } from "../http/async-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { chatParamsSchema, messageSchema, titleSchema } from "../schemas.js";
import * as chats from "../services/chat.service.js";
import * as messages from "../services/message.service.js";
import * as documents from "../services/document.service.js";
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

router.delete("/:chatId", asyncHandler(async (req, res) => {
  const { chatId } = chatParamsSchema.parse(req.params);
  await chats.deleteChat(req.user!.id, chatId);
  res.status(204).send();
}));

router.get("/:chatId/messages", asyncHandler(async (req, res) => {
  const { chatId } = chatParamsSchema.parse(req.params);
  const result = await messages.listMessages(req.user!.id, chatId);
  res.json(result);
}));

router.post("/:chatId/messages", asyncHandler(async (req, res) => {
  const { chatId } = chatParamsSchema.parse(req.params);
  const { content, mode } = messageSchema.parse(req.body);
  const result = await messages.ask(req.user!.id, chatId, content, mode);
  res.status(201).json(result);
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

router.post(
  "/:chatId/documents",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { chatId } = chatParamsSchema.parse(req.params);

    if (!req.file) {
      throw new AppError(400, "One supported file is required");
    }

    const result = await documents.addDocument(req.user!.id, chatId, req.file);
    res.status(201).json(result);
  }),
);

export default router;
