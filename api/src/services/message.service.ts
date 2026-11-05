/**
 * @concept Multi-step agent (Sequential vectorization, pgvector retrieval, prompt construction, LLM synthesis)
 * @concept Token & cost monitoring (Token estimation, latency tracking, estimated USD expenditure in MongoDB)
 *
 * Implements the end-to-end RAG orchestrator:
 * 1. Step 1: Query Vectorization (1024-dim embedding)
 * 2. Step 2: Cosine Similarity Retrieval over pgvector with tenant isolation
 * 3. Step 3: Prompt Construction with citation contracts and delimiter sandboxing
 * 4. Step 4: LLM Synthesis with structured JSON schema and citation verification
 * 5. Telemetry & Cost Monitoring: Captures tokens, latency, and estimated cost in MongoDB
 */
import { prisma } from "../db/prisma.js";
import { embed, answer } from "../ai/ai-client.js";
import { buildMessages, parseAnswer } from "../ai/prompt-builder.js";
import { retrieve } from "../ai/retrieval.js";
import { ownedChat } from "./chat.service.js";
import { logMongoMessage } from "../db/mongo.js";

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

  const citationsWithContent = result.citations.map((cit: any) => {
    const match = matches.find(
      (m) => m.original_name === cit.source && m.chunk_index === cit.chunk
    );
    return {
      source: cit.source,
      chunk: cit.chunk,
      content: match ? match.content : "",
    };
  });

  const savedMessage = await prisma.message.create({
    data: {
      chatId,
      role: "ASSISTANT",
      content: result.answer,
      citations: citationsWithContent,
    },
  });

  // Polyglot persistence: asynchronously log conversation turn & telemetry to MongoDB
  logMongoMessage({
    messageId: savedMessage.id,
    chatId,
    userId,
    role: "ASSISTANT",
    content: result.answer,
    citations: citationsWithContent,
    telemetry: {
      embedDurationMs: Date.now() - startEmbed,
      retrievalDurationMs: Date.now() - startRetrieve,
      llmDurationMs: Date.now() - startAnswer,
      totalLatencyMs: Date.now() - startEmbed,
      providerUsed: "client-pool",
      retrievedChunkCount: matches.length,
      // Token & Cost Monitoring: approximate token metrics (1 token ≈ 4 characters)
      // Prompt tokens from user query and context
      promptTokens: Math.ceil((content.length + JSON.stringify(modelMessages).length) / 4),
      completionTokens: Math.ceil(result.answer.length / 4),
      totalTokens: Math.ceil((content.length + JSON.stringify(modelMessages).length + result.answer.length) / 4),
      // OpenRouter LLaMA 3.3 70B pricing: ~$0.40 per 1M tokens ($0.0000004 / token)
      estimatedCostUsd: Number((Math.ceil((content.length + JSON.stringify(modelMessages).length + result.answer.length) / 4) * 0.0000004).toFixed(6)),
    },
  }).catch(() => {});

  return savedMessage;
}
