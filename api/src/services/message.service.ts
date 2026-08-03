import { prisma } from "../db/prisma.js";
import { embed, answer } from "../ai/ai-client.js";
import { buildMessages, parseAnswer } from "../ai/prompt-builder.js";
import { retrieve } from "../ai/retrieval.js";
import { ownedChat } from "./chat.service.js";

export async function listMessages(userId: string, chatId: string) {
  await ownedChat(userId, chatId);

  return prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });
}

export async function ask(userId: string, chatId: string, content: string) {
  await ownedChat(userId, chatId);

  const history = await listMessages(userId, chatId);

  await prisma.message.create({
    data: {
      chatId,
      role: "USER",
      content,
    },
  });

  const queryVector = await embed(content);
  const matches = await retrieve(chatId, queryVector);

  const modelMessages = buildMessages(
    content,
    matches.map((match) => ({
      content: match.content,
      document: match.original_name,
      chunk: match.chunk_index,
    })),
    history.map((message) => ({
      role: message.role.toLowerCase(),
      content: message.content,
    })),
  );

  const result = parseAnswer(await answer(modelMessages));

  return prisma.message.create({
    data: {
      chatId,
      role: "ASSISTANT",
      content: result.answer,
      citations: result.citations,
    },
  });
}
