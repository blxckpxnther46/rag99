import { prisma } from "../db/prisma.js";

type RetrievedChunk = {
  content: string;
  original_name: string;
  chunk_index: number;
  distance: number;
};

export async function retrieve(chatId: string, vector: number[], limit = 4) {
  const literal = `[${vector.join(",")}]`;

  return prisma.$queryRawUnsafe<RetrievedChunk[]>(
    `SELECT
       dc.content,
       d."originalName" AS original_name,
       dc."chunkIndex" AS chunk_index,
       dc.embedding <=> $1::vector AS distance
     FROM "DocumentChunk" dc
     JOIN "Document" d ON d.id = dc."documentId"
     WHERE dc."chatId" = $2
       AND dc.embedding IS NOT NULL
     ORDER BY dc.embedding <=> $1::vector
     LIMIT $3`,
    literal,
    chatId,
    limit,
  );
}
