/**
 * ─────────────────────────────────────────────────────────────
 * @concept Polyglot Persistence Architecture
 * @concept ACID Transactions
 * ─────────────────────────────────────────────────────────────
 * Persistence Architecture Overview:
 * - Document Uploads, text chunks, and vector embeddings are stored in
 *   PostgreSQL via Prisma (relational integrity with ACID guarantees).
 * - Document Deletions: Handled via `prisma.$transaction()` to guarantee
 *   all-or-nothing cascading atomicity across DocumentChunks, Documents,
 *   Messages, and the Chat session.
 * - MongoDB: Used alongside PostgreSQL for non-relational telemetry,
 *   evaluation logs, and dynamic citations.
 * ─────────────────────────────────────────────────────────────
 */
import { prisma } from "../db/prisma.js";
import { AppError } from "../http/errors.js";

export function listChats(userId: string) {
  return prisma.chat.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export function createChat(userId: string, title?: string) {
  return prisma.chat.create({
    data: {
      userId,
      title: title?.trim() || "New chat",
    },
  });
}

export async function ownedChat(userId: string, id: string) {
  const chat = await prisma.chat.findFirst({
    where: { id, userId },
  });

  if (!chat) {
    throw new AppError(404, "Chat not found");
  }

  return chat;
}

export async function getChat(userId: string, id: string) {
  await ownedChat(userId, id);

  return prisma.chat.findUnique({
    where: { id },
    include: {
      documents: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function renameChat(userId: string, id: string, title: string) {
  await ownedChat(userId, id);

  return prisma.chat.update({
    where: { id },
    data: { title: title.trim() },
  });
}

/**
 * ─────────────────────────────────────────────────────────────
 * ACID Transaction in PostgreSQL:
 * Guarantees all-or-nothing atomicity across DocumentChunks, Documents, Messages, and Chat.
 * If any step fails, all deletions are rolled back automatically.
 * MongoDB telemetry cleanup is subsequently called in chat.routes.ts.
 * ─────────────────────────────────────────────────────────────
 */
export async function deleteChat(userId: string, id: string) {
  await ownedChat(userId, id);
  return prisma.$transaction(async (tx) => {
    // Step 1: Cascade delete all vector embeddings/chunks belonging to this chat
    await tx.documentChunk.deleteMany({ where: { chatId: id } });
    // Step 2: Cascade delete all document records in this chat
    await tx.document.deleteMany({ where: { chatId: id } });
    // Step 3: Cascade delete all relational chat messages
    await tx.message.deleteMany({ where: { chatId: id } });
    // Step 4: Finally delete the parent chat session
    return tx.chat.delete({ where: { id } });
  });
}
