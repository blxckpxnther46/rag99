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

export async function ask(userId: string, chatId: string, content: string, mode: "concise" | "explain" = "concise") {
  const chat = await ownedChat(userId, chatId);

  const history = await listMessages(userId, chatId);

  await prisma.message.create({
    data: {
      chatId,
      role: "USER",
      content,
    },
  });

  if (chat && chat.title === "New Chat") {
    const newTitle = content.length > 30 ? content.slice(0, 30) + "..." : content;
    await prisma.chat.update({
      where: { id: chatId },
      data: { title: newTitle },
    });
  }

  console.log(`[RAG] Embedding query...`);
  const startEmbed = Date.now();
  const queryVector = await embed(content, "query");
  console.log(`[RAG] Embedding completed in ${Date.now() - startEmbed}ms`);

  console.log(`[RAG] Retrieving context from database...`);
  const startRetrieve = Date.now();
  const matches = await retrieve(chatId, queryVector);
  console.log(`[RAG] Database retrieval completed in ${Date.now() - startRetrieve}ms`);

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
    mode,
  );

  console.log(`[RAG] Generating answer from LLM pool...`);
  const startAnswer = Date.now();
  const completionText = await answer(modelMessages);
  console.log(`[RAG] LLM response generated in ${Date.now() - startAnswer}ms`);

  const result = parseAnswer(completionText);

  return prisma.message.create({
    data: {
      chatId,
      role: "ASSISTANT",
      content: result.answer,
      citations: result.citations,
    },
  });
}
