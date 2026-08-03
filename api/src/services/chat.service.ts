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

export async function deleteChat(userId: string, id: string) {
  await ownedChat(userId, id);
  return prisma.chat.delete({ where: { id } });
}
