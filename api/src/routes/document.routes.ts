import { Router } from "express";
import { asyncHandler } from "../http/async-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { documentParamsSchema } from "../schemas.js";
import * as service from "../services/document.service.js";

const router = Router();

router.use(requireAuth);

router.delete("/:documentId", asyncHandler(async (req, res) => {
  const { documentId } = documentParamsSchema.parse(req.params);
  await service.removeDocument(req.user!.id, documentId);
  res.status(204).send();
}));

export default router;
