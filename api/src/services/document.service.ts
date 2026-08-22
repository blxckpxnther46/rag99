import { prisma } from "../db/prisma.js";
import crypto from "node:crypto";
import { saveUpload, deleteUpload } from "../documents/file-storage.js";
import { extractText } from "../documents/extract-text.js";
import { chunkText } from "../documents/chunk-text.js";
import { embed } from "../ai/ai-client.js";
import { AppError } from "../http/errors.js";
import { ownedChat } from "./chat.service.js";

export async function listDocuments(userId: string, chatId: string) {
  await ownedChat(userId, chatId);

  return prisma.document.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
  });
}

export async function addDocument(
  userId: string,
  chatId: string,
  file: Express.Multer.File,
) {
  const chat = await ownedChat(userId, chatId);

  const saved = await saveUpload(userId, chatId, file);

  const document = await prisma.document.create({
    data: {
      id: saved.id,
      chatId,
      originalName: file.originalname,
      storedName: saved.storedName,
      filePath: saved.filePath,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    },
  });

  if (chat && chat.title === "New Chat") {
    await prisma.chat.update({
      where: { id: chatId },
      data: { title: file.originalname },
    });
  }

  // Trigger background parsing, chunking and embedding without awaiting it
  processDocumentInBackground(document.id, chatId, file.buffer, file.mimetype, file.originalname)
    .catch((error) => {
      console.error(`Background ingestion promise rejected for document ${document.id}:`, error);
    });

  return document;
}

async function processDocumentInBackground(
  documentId: string,
  chatId: string,
  buffer: Buffer,
  mimeType: string,
  originalName: string,
) {
  try {
    const text = await extractText(buffer, mimeType, originalName);
    const chunks = chunkText(text);

    for (let index = 0; index < chunks.length; index += 1) {
      const vector = await embed(chunks[index], "passage");

      await prisma.$executeRawUnsafe(
        `INSERT INTO "DocumentChunk"
           ("id", "documentId", "chatId", "content", "chunkIndex", "embedding", "createdAt")
         VALUES
           ($1, $2, $3, $4, $5, $6::vector, NOW())`,
        crypto.randomUUID(),
        documentId,
        chatId,
        chunks[index],
        index,
        `[${vector.join(",")}]`,
      );
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "READY" },
    });
  } catch (error) {
    console.error(`Failed to process document ${documentId}:`, error);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Processing failed",
      },
    });
  }
}


export async function removeDocument(userId: string, documentId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      chat: { userId },
    },
  });

  if (!document) {
    throw new AppError(404, "Document not found");
  }

  await prisma.document.delete({ where: { id: documentId } });
  await deleteUpload(document.storedName);
}
