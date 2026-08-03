import { Router } from "express";
import multer from "multer";
import env from "../config.js";
import { asyncHandler } from "../http/async-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../http/errors.js";
import { chatParamsSchema, documentParamsSchema } from "../schemas.js";
import * as service from "../services/document.service.js";

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

const router = Router();

router.use(requireAuth);

router.get("/chats/:chatId/documents", asyncHandler(async (req, res) => {
  const { chatId } = chatParamsSchema.parse(req.params);
  const result = await service.listDocuments(req.user!.id, chatId);
  res.json(result);
}));

router.post(
  "/chats/:chatId/documents",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { chatId } = chatParamsSchema.parse(req.params);

    if (!req.file) {
      throw new AppError(400, "One supported file is required");
    }

    const result = await service.addDocument(req.user!.id, chatId, req.file);
    res.status(201).json(result);
  }),
);

router.delete("/:documentId", asyncHandler(async (req, res) => {
  const { documentId } = documentParamsSchema.parse(req.params);
  await service.removeDocument(req.user!.id, documentId);
  res.status(204).send();
}));

export default router;
