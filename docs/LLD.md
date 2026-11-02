# Low Level Design (LLD) - rag99

## 1. Project Overview
This document details the Low-Level Design (LLD) for the rag99 project. It provides an in-depth look at implementation details, including folder structures, schemas for our **Polyglot Persistence Architecture** (PostgreSQL + pgvector and MongoDB), API route specifications, and component behaviors for Version 1.

## 2. Backend Folder Structure
The backend is structured as an Express application utilizing Prisma (PostgreSQL) and Mongoose (MongoDB).

```text
api/
  prisma/
    schema.prisma      # PostgreSQL models (User, Chat, Message, Document, DocumentChunk)
    migrations/        # Migration history
  src/
    server.ts          # Entry point, starts Express on env.PORT, triggers connectMongo()
    app.ts             # Express app config: cors, json, rateLimit, routes, errorHandler
    config.ts          # Zod-validated env vars loaded from .env via dotenv
    schemas.ts         # Zod request validation schemas
    self-check.ts      # Smoke test for chunking and JSON parsing
    db/
      prisma.ts        # Singleton PrismaClient export
      mongo.ts         # Mongoose connection, ChatMessageDoc schema, model, and CRUD helpers
    ai/
      ai-client.ts     # Facade: embed() and answer() -> client-pool
      client-pool.ts   # Multi-provider round-robin for LLM (Groq + OpenRouter); single standardized 1024-dim embedding model (text-embedding-3-small) via key rotation
      prompt-builder.ts # buildMessages() and parseAnswer() for RAG prompts
      retrieval.ts     # pgvector cosine distance raw SQL query
    documents/
      file-storage.ts  # Cloudinary upload/delete with stream API
      extract-text.ts  # pdf-parse, mammoth, UTF-8 text extraction
      chunk-text.ts    # Fixed-size sliding window chunker (2000/200)
    http/
      errors.ts        # AppError class + errorResponse() normalizer
      async-handler.ts # Promise.resolve().catch(next) wrapper
    middleware/
      auth.ts          # JWT Bearer verification, req.user attachment
      error.ts         # Global ErrorRequestHandler
      rate-limit.ts    # In-memory IP-based rate limiter (Map)
    routes/
      auth.routes.ts   # POST /register, /login, /google
      chat.routes.ts   # Full CRUD + messages + documents + rating endpoint
      document.routes.ts # DELETE /:documentId
    services/
      auth.service.ts  # register, login, loginWithGoogle (bcryptjs, JWT, Google tokeninfo)
      chat.service.ts  # listChats, createChat, getChat, ownedChat, renameChat, deleteChat
      document.service.ts # listDocuments, addDocument (with background ingestion), removeDocument
      message.service.ts  # listMessages, ask (full RAG pipeline + MongoDB audit logger)
```

## 3. Frontend Folder Structure
The frontend is built using Next.js App Router.

```text
web/
  app/
    layout.tsx         # Root layout, Google Identity Services script injection
    page.tsx           # / redirect to /chats
    globals.css        # Tailwind directives, custom keyframes, scrollbar styles
    login/
      page.tsx         # Email/password + Google OAuth login
    register/
      page.tsx         # Name/email/password + Google OAuth register
    chats/
      layout.tsx       # Sidebar + ChatContext.Provider wrapper
      context.tsx      # ChatContext definition + useChatContext hook
      page.tsx         # Welcome screen with suggested prompts
      [chatId]/
        page.tsx       # Active chat: messages, RAG loading, documents, citations, rating buttons
  components/
    Logo.tsx           # SVG brand logo
    LiquidGlass.tsx    # Glassmorphic UI primitives
    LoadingState.tsx   # Pixel-grid animated loader
    StreamingText.tsx  # Typewriter text reveal with citation preprocessing
    ThinkingState.tsx  # RAG execution trace visualization
    ContextCards.tsx   # Retrieved evidence chunk display cards
    ui/
      button.tsx       # Base button primitive
      input.tsx        # Base input primitive
  lib/
    api.ts             # fetch wrapper with JWT injection, 401 redirect, FormData detection
    types.ts           # Chat, Document, CitationType, Message types
```

## 4. Database Architecture: Polyglot Persistence

### 4.1 Primary Relational & Vector Store (PostgreSQL + pgvector)

#### Complete Prisma Schema (`api/prisma/schema.prisma`)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String
  passwordHash String
  chats        Chat[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Chat {
  id        String     @id @default(uuid())
  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String     @default("New chat")
  messages  Message[]
  documents Document[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@index([userId])
}

model Message {
  id        String   @id @default(uuid())
  chatId    String
  chat      Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  role      String
  content   String
  citations Json?
  createdAt DateTime @default(now())

  @@index([chatId])
}

enum DocumentStatus {
  PROCESSING
  READY
  FAILED
}

model Document {
  id           String          @id @default(uuid())
  chatId       String
  chat         Chat            @relation(fields: [chatId], references: [id], onDelete: Cascade)
  originalName String
  storedName   String
  filePath     String
  mimeType     String
  sizeBytes    Int
  status       DocumentStatus  @default(PROCESSING)
  errorMessage String?
  chunks       DocumentChunk[]
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@index([chatId])
}

model DocumentChunk {
  id         String                 @id @default(uuid())
  documentId String
  document   Document               @relation(fields: [documentId], references: [id], onDelete: Cascade)
  chatId     String
  content    String
  chunkIndex Int
  pageNumber Int                    @default(1)
  embedding  Unsupported("vector")?
  createdAt  DateTime               @default(now())

  @@index([chatId])
  @@index([documentId])
}
```

---

### 4.2 Document & Telemetry Store (MongoDB Mongoose Schema)

Implemented in `api/src/db/mongo.ts`. Used for audit trails, latency metrics, and user feedback ratings.

```typescript
// Subdocument Schema: Citations
const CitationItemSchema = new Schema(
  {
    source: { type: String, required: true },
    chunk: { type: Number, required: true },
    content: { type: String, default: "" },
  },
  { _id: false }
);

// Subdocument Schema: Execution Latency Telemetry
const TelemetrySchema = new Schema(
  {
    embedDurationMs: { type: Number, default: 0 },
    retrievalDurationMs: { type: Number, default: 0 },
    llmDurationMs: { type: Number, default: 0 },
    totalLatencyMs: { type: Number, default: 0 },
    providerUsed: { type: String, default: "unknown" },
    retrievedChunkCount: { type: Number, default: 0 },
  },
  { _id: false }
);

// Main Document Schema: Chat Messages & User Feedback
const ChatMessageDocSchema = new Schema(
  {
    messageId: { type: String, required: true, index: true },
    chatId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["USER", "ASSISTANT"], required: true },
    content: { type: String, required: true },
    citations: { type: [CitationItemSchema], default: [] },
    rating: { type: String, enum: ["up", "down", ""], default: "" },
    telemetry: { type: TelemetrySchema, default: () => ({}) },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const ChatMessageDoc =
  mongoose.models.ChatMessageDoc ||
  mongoose.model("ChatMessageDoc", ChatMessageDocSchema, "chat_messages");
```

#### MongoDB CRUD Operations Implemented (Telemetry & Feedback Only):
> **Note on Document Storage:** All document uploads, processing, and chunk vectors reside in PostgreSQL (`Document` and `DocumentChunk`). The following MongoDB CRUD operations handle conversational telemetry and user feedback:
1. **Create:** `logMongoMessage(params)` logs the user query and assistant response with subdocument citations and latency measurements.
2. **Read:** `ChatMessageDoc.find({ chatId })` queries full audit histories.
3. **Update (Feedback):** `updateMongoRating(messageId, rating)` updates thumbs-up/down ratings for user responses.
4. **Delete (Cascade):** `deleteMongoMessagesByChat(chatId)` cleans up audit logs when a chat is deleted.

---

## 5. API Route Specifications

| Method | Route | Description | Request Body / Params | Response |
|---|---|---|---|---|
| `GET` | `/health` | Health probe | None | `{ ok: true }` |
| `POST` | `/api/auth/register` | Register user | `{ email, name, password }` | `{ token, user }` |
| `POST` | `/api/auth/login` | Login user | `{ email, password }` | `{ token, user }` |
| `POST` | `/api/auth/google` | Google OAuth | `{ idToken }` | `{ token, user }` |
| `GET` | `/api/chats` | List user chats | None (Auth header) | `Chat[]` |
| `POST` | `/api/chats` | Create chat | `{ title? }` | `Chat` |
| `GET` | `/api/chats/:chatId` | Get chat detail | None | `Chat & { messages, documents }` |
| `PATCH`| `/api/chats/:chatId` | Rename chat | `{ title }` | `Chat` |
| `DELETE`| `/api/chats/:chatId` | Delete chat | None | `204 No Content` |
| `GET` | `/api/chats/:chatId/messages` | List messages | None | `Message[]` |
| `POST` | `/api/chats/:chatId/messages` | Execute RAG query | `{ content, mode? }` | `Message` |
| `PATCH`| `/api/chats/:chatId/messages/:messageId/rating` | Save feedback | `{ rating: "up" \| "down" }` | `{ ok: true, rating }` |
| `GET` | `/api/chats/:chatId/analytics` | MongoDB Aggregation stats | None | `AggregationStats[]` |
| `GET` | `/api/chats/:chatId/documents` | List documents | None | `Document[]` |
| `POST` | `/api/chats/:chatId/documents` | Upload file | Multipart `file` | `201 Created` |
| `DELETE`| `/api/documents/:documentId` | Delete document | None | `204 No Content` |

---

## 6. Deployment Specifications

### 6.1 Backend Web Service on Render
- **Source:** Git repository root.
- **Root Directory:** `api`
- **Environment:** `Node`
- **Build Command:** `npm install && npx prisma generate && npm run build`
- **Start Command:** `node dist/server.js`
- **Environment Variables Required:**
  - `DATABASE_URL`: PostgreSQL connection string (with `?sslmode=require`)
  - `JWT_SECRET`: Random 32+ character string
  - `CORS_ORIGIN`: Vercel frontend URL (e.g. `https://rag99.vercel.app` or `*`)
  - `AI_BASE_URL`: `https://openrouter.ai/api/v1`
  - `AI_API_KEY`: OpenRouter primary API key
  - `AI_CHAT_MODEL`: `meta-llama/llama-3.3-70b-instruct`
  - `AI_EMBEDDING_MODEL`: `openai/text-embedding-3-small`
  - `EMBEDDING_DIMENSION`: `1024`
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `GROQ_API_KEY`, `OPENROUTER_API_KEY1`, `OPENROUTER_API_KEY2`, `OPENROUTER_API_KEY3`
  - `MONGODB_URI`: MongoDB Atlas connection URI

### 6.2 Frontend Application on Vercel
- **Framework Preset:** `Next.js`
- **Root Directory:** `web`
- **Build Command:** `next build` (standard Vercel automatic default)
- **Environment Variables Required:**
  - `NEXT_PUBLIC_API_URL`: Live Render backend URL (e.g., `https://rag99-api.onrender.com`)
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth Client ID


---

## 7. Implementation Details for System & Engineering Concepts

### 7.1 NoSQL Relationships (Embedding vs Referencing)
- **File:** `api/src/db/mongo.ts`
- **Embedding:** Citations (`CitationSubSchema`) and execution telemetry (`RagTelemetrySubSchema`) are embedded directly as subdocument arrays/objects inside `ChatMessageDocSchema`.
- **Referencing:** `MongoChatSession` schema declares references using `Schema.Types.ObjectId` pointing to `"ChatMessage"`:
```typescript
const ChatSessionMetaSchema = new Schema({
  chatId: { type: String, required: true, unique: true },
  lastMessageRef: { type: Schema.Types.ObjectId, ref: "ChatMessage" },
  pinnedMessages: [{ type: Schema.Types.ObjectId, ref: "ChatMessage" }]
});
```
- Resolved at query time via Mongoose `.populate("lastMessageRef")`.

### 7.2 NoSQL Aggregation Pipelines
- **File:** `api/src/db/mongo.ts` (`getChatAnalyticsPipeline`)
```typescript
export async function getChatAnalyticsPipeline(chatId: string) {
  return MongoChatMessage.aggregate([
    { $match: { chatId, role: "ASSISTANT" } },
    {
      $group: {
        _id: "$chatId",
        totalResponses: { $sum: 1 },
        avgEmbedDurationMs: { $avg: "$telemetry.embedDurationMs" },
        avgRetrievalDurationMs: { $avg: "$telemetry.retrievalDurationMs" },
        avgLlmDurationMs: { $avg: "$telemetry.llmDurationMs" },
        avgTotalLatencyMs: { $avg: "$telemetry.totalLatencyMs" },
        upvotes: { $sum: { $cond: [{ $eq: ["$rating", "up"] }, 1, 0] } },
        downvotes: { $sum: { $cond: [{ $eq: ["$rating", "down"] }, 1, 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        chatId: "$_id",
        totalResponses: 1,
        avgEmbedDurationMs: { $round: ["$avgEmbedDurationMs", 2] },
        avgRetrievalDurationMs: { $round: ["$avgRetrievalDurationMs", 2] },
        avgLlmDurationMs: { $round: ["$avgLlmDurationMs", 2] },
        avgTotalLatencyMs: { $round: ["$avgTotalLatencyMs", 2] },
        upvotes: 1,
        downvotes: 1
      }
    },
    { $sort: { totalResponses: -1 } }
  ]);
}
```

### 7.3 PostgreSQL ACID Transactions
- **File:** `api/src/services/chat.service.ts`
```typescript
export async function deleteChat(userId: string, id: string) {
  await ownedChat(userId, id);
  return prisma.$transaction(async (tx) => {
    await tx.documentChunk.deleteMany({ where: { chatId: id } });
    await tx.document.deleteMany({ where: { chatId: id } });
    await tx.message.deleteMany({ where: { chatId: id } });
    return tx.chat.delete({ where: { id } });
  });
}
```

### 7.4 Input Sanitization & Prompt Injection Defenses
- **File:** `api/src/middleware/sanitization.ts`
- `sanitizeHtml(input: string)`: Strips `<script>`, `<iframe>`, `javascript:`, and DOM event handlers.
- `sanitizePrompt(prompt: string)`: Matches input against prompt injection signatures (`/ignore\s+(all\s+)?previous\s+instructions/i`, `/system\s+override/i`, etc.) and strips special delimiter tokens (`<|im_start|>`, `### System:`).

### 7.5 Caching with Redis & In-Memory Fallback
- **File:** `api/src/db/cache.ts`
- Implements `RedisCacheManager` using `ioredis` with key-value TTL support and in-memory Map fallback.

### 7.6 Scheduled Jobs & Cron Runner
- **File:** `api/src/jobs/cron.ts`
- Implements automated periodic tasks using `node-cron` (`cron.schedule("0 * * * *", ...)`).

### 7.7 WebSocket / Real-Time Communication
- **File:** `api/src/server.ts`
- Attaches `WebSocketServer` from `ws` to the Node HTTP server on path `/ws`.

### 7.8 Function Calling / Tool Use
- **File:** `api/src/ai/tools.ts`
- Declares `ToolDefinition` schemas for `query_document_chunks` and `calculate_reading_time` with JSON parameter validation.

### 7.9 JavaScript Event Loop, Hoisting & SSR
- **Event Loop & Hoisting:** `web/components/ThinkingState.tsx` documents macrotask queue scheduling via `setTimeout` and compilation phase function hoisting.
- **Server-Side Rendering:** `web/app/layout.tsx` and `web/app/page.tsx` are React Server Components executing on the server during SSR.