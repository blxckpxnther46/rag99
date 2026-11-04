/**
 * ─────────────────────────────────────────────────────────────
 * CONCEPT: RAG — Embeddings & Vector Retrieval
 * ─────────────────────────────────────────────────────────────
 * WHAT THIS FILE IS FOR:
 * Executes raw SQL vector similarity queries against PostgreSQL
 * using the pgvector extension.
 *
 * HOW IT WORKS (LINE-BY-LINE):
 * 1. Vector Formatting: Converts numerical array into pgvector literal format `[0.12, -0.05, ...]`.
 * 2. Cosine Distance Operator (`<=>`): Measures angular difference between 1024-d embeddings.
 * 3. Chat/Tenant Isolation: `WHERE dc."chatId" = $2` guarantees that queries only retrieve
 *    chunks uploaded to this specific chat session, preventing cross-tenant leakage.
 * 4. K-Nearest Neighbor Retrieval: `ORDER BY distance ASC LIMIT $3` selects top-K most relevant chunks.
 * ─────────────────────────────────────────────────────────────
 */
import { prisma } from "../db/prisma.js";

type RetrievedChunk = {
  content: string;
  original_name: string;
  chunk_index: number;
  distance: number;
};

export async function retrieve(chatId: string, vector: number[], limit = 4) {
  // Step 1: Format 1024-dimension array into a PostgreSQL pgvector literal string: "[0.012,-0.045,...]"
  const literal = `[${vector.join(",")}]`;

  // Step 2: Query pgvector using raw SQL for optimal performance
  return prisma.$queryRawUnsafe<RetrievedChunk[]>(
    `SELECT
       dc.content,
       d."originalName" AS original_name,
       dc."chunkIndex" AS chunk_index,
       -- Cosine Distance Operator (<=>): 0 means identical direction; 2 means opposite
       dc.embedding <=> $1::vector AS distance
     FROM "DocumentChunk" dc
     JOIN "Document" d ON d.id = dc."documentId"
     -- Security & Multi-tenancy: Isolate retrieval strictly to the current active chat session
     WHERE dc."chatId" = $2
       AND dc.embedding IS NOT NULL
     -- Order by cosine distance ascending (closest semantic match first)
     ORDER BY dc.embedding <=> $1::vector
     -- Top-K retrieval limit (default 4 chunks)
     LIMIT $3`,
    literal,
    chatId,
    limit,
  );
}
