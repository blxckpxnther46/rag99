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
 * ACID Transaction demonstration in PostgreSQL via Prisma:
 * Guarantees all-or-nothing atomicity across DocumentChunks, Documents, Messages, and Chat.
 */
export async function deleteChat(userId: string, id: string) {
  await ownedChat(userId, id);
  return prisma.$transaction(async (tx) => {
    // 1. Delete all document chunks in this chat
    await tx.documentChunk.deleteMany({ where: { chatId: id } });
    // 2. Delete all documents in this chat
    await tx.document.deleteMany({ where: { chatId: id } });
    // 3. Delete all messages in this chat
    await tx.message.deleteMany({ where: { chatId: id } });
    // 4. Finally delete the chat itself
    return tx.chat.delete({ where: { id } });
  });
}
