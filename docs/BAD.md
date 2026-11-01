# Backend Architecture & Development (BAD)

This document outlines the backend architecture of rag99, implemented with Express.js, TypeScript, PostgreSQL (pgvector via Prisma), and MongoDB (via Mongoose).

## 1. Architecture Overview
The backend is an Express.js 4 application operating in Node.js ES modules mode. It features a **Polyglot Persistence Architecture**:
- **PostgreSQL (Neon) via Prisma ORM:** Manages relational entities (User, Chat, Message, Document, DocumentChunk) and performs raw vector similarity queries via `pgvector`.
- **MongoDB Atlas via Mongoose:** Manages semi-structured conversation histories, embedded citation subdocuments, user feedback ratings (`"up"` / `"down"`), and execution latency telemetry.

## 2. Folder Structure

```
api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── ai/
│   │   ├── ai-client.ts
│   │   ├── client-pool.ts
│   │   ├── prompt-builder.ts
│   │   └── retrieval.ts
│   ├── db/
│   │   ├── prisma.ts
│   │   └── mongo.ts
│   ├── documents/
│   │   ├── chunk-text.ts
│   │   ├── extract-text.ts
│   │   └── file-storage.ts
│   ├── http/
│   │   ├── async-handler.ts
│   │   └── errors.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── error.ts
│   │   └── rate-limit.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── chat.routes.ts
│   │   └── document.routes.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── chat.service.ts
│   │   ├── document.service.ts
│   │   └── message.service.ts
│   ├── app.ts
│   ├── config.ts
│   ├── schemas.ts
│   └── server.ts
```

## 3. Express Application Configuration
`api/src/app.ts` configures the middleware stack:
- **CORS:** Flexible origin callback supporting local development (`http://localhost:3000`) and production Vercel domains (`.vercel.app`).
- **Body Parsing:** `express.json({ limit: "1mb" })`.
- **Rate Limiting:** IP-based in-memory rate limiting.
- **Routes:** `/health`, `/api/auth`, `/api/chats`, `/api/documents`.
- **Error Handler:** Global centralized error handler catching Zod, Multer, and AppErrors.

## 4. Routes & Endpoints
- **Authentication (`auth.routes.ts`):** `POST /register`, `POST /login`, `POST /google`.
- **Chat Management (`chat.routes.ts`):**
  - `GET /`: List all chats for current user.
  - `POST /`: Create a new chat.
  - `GET /:chatId`: Retrieve chat with messages and documents.
  - `PATCH /:chatId`: Rename chat title.
  - `DELETE /:chatId`: Delete chat (cascading deletes in PostgreSQL and cleanup in MongoDB).
  - `GET /:chatId/messages`: Retrieve chat message history.
  - `POST /:chatId/messages`: Run RAG question answering pipeline.
  - `PATCH /:chatId/messages/:messageId/rating`: Update user feedback rating in MongoDB.
  - `GET /:chatId/documents`: List documents linked to chat.
  - `POST /:chatId/documents`: Ingest document via Multer.
- **Document Management (`document.routes.ts`):** `DELETE /:documentId`.

## 5. Polyglot Database Layer

### 5.1 Prisma & PostgreSQL
- `api/src/db/prisma.ts` exports a singleton `PrismaClient` instance.
- Handles relational operations, unique email constraints, and cascade deletions (`onDelete: Cascade`).
- Executes raw SQL for vector operations:
  ```sql
  SELECT dc.content, d."originalName", dc."chunkIndex", dc.embedding <=> $1::vector AS distance ...
  ```

### 5.2 Mongoose & MongoDB Atlas
- `api/src/db/mongo.ts` exports `ChatMessageDoc` model and helper functions.
- Models:
  - `ChatMessageDoc`: Fields include `messageId`, `chatId`, `userId`, `role`, `content`, `citations`, `rating`, `telemetry`, and timestamps.
  - `telemetry`: Embedded subdocument for `embedDurationMs`, `retrievalDurationMs`, `llmDurationMs`, `totalLatencyMs`, `providerUsed`, and `retrievedChunkCount`.
- Helper methods:
  - `connectMongo()`: Connects to MongoDB Atlas with connection caching.
  - `logMongoMessage()`: Asynchronously logs query, assistant response, and performance metrics.
  - `updateMongoRating()`: Updates user feedback thumbs up/down state.
  - `deleteMongoMessagesByChat()`: Purges chat messages when chat is removed.
- **Fail-Safe Mechanism:** In the event of a connection failure or network delay to Atlas, all MongoDB calls fail gracefully without rejecting the HTTP request, guaranteeing that core RAG query workflows stay available.

## 6. Authentication & Security
- **Local:** Password hashing via `bcryptjs` with 12 salt rounds.
- **Google OAuth 2.0:** Verified using Google's `tokeninfo` endpoint to validate audience (`aud`), issuer, and email verification.
- **JWT:** 7-day expiration with HMAC SHA-256 signature containing `userId` and `email`.
- **Rate Limiting:** In-memory per-IP sliding window rate limiting (60 requests/minute).

## 7. Deployment Configuration (Render)
- **Service Type:** Web Service.
- **Root Directory:** `api`
- **Build Command:** `npm install && npx prisma generate && npm run build`
- **Start Command:** `node dist/server.js`
- **Health Check Path:** `/health`
- **Environment Variables:** `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `AI_BASE_URL`, `AI_API_KEY`, `AI_CHAT_MODEL`, `AI_EMBEDDING_MODEL`, `CLOUDINARY_*`, `MONGODB_URI`, `GROQ_API_KEY`, `OPENROUTER_API_KEY*`.
