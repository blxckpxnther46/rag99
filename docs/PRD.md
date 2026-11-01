# Product Requirements Document (PRD)

## 1. Executive Summary
rag99 is a robust, full-stack Retrieval-Augmented Generation (RAG) web application that enables users to upload various document types (PDF, Word, Markdown, Text) and converse with an AI assistant grounded in those documents. Built with Next.js 15, Express.js, a Polyglot Persistence Architecture (PostgreSQL + pgvector for relational data and embeddings, MongoDB for conversation telemetry and feedback tracking), and an innovative multi-provider LLM pool, it prioritizes reliability, accuracy, and an excellent user experience.

## 2. Product Vision
To provide a secure, fast, and highly reliable document interaction platform where users can interrogate their own data through an intelligent, context-aware AI, free from provider lock-in or single points of failure, backed by verifiable evidence citations and telemetry tracking.

## 3. Problem Statement
Users frequently have large, complex documents but struggle to extract specific answers quickly or synthesize actionable insights. Standard LLMs hallucinate when asked about proprietary or private documents. Existing solutions often suffer from single-provider rate limits, brittle monolithic databases, and lack of real-time auditability. rag99 addresses this with vector similarity retrieval, multi-provider redundancy, and polyglot persistence.

## 4. Target Users
1. **Student / Researcher:** Needs to upload lengthy academic papers (PDFs) or class notes (Word/Markdown) and ask questions to prepare for exams or write reports.
2. **Evaluator / Reviewer:** Needs to quickly assess the quality of the system's output, examining citations, retrieved source chunks, and execution latency.
3. **Product & ML Engineers:** Needs visibility into model latency, token counts, and user feedback (thumbs up / down) to refine retrieval quality and system prompts.
4. **Maintainer / Developer:** Needs a robust, modular monorepo environment with clear architecture across relational, vector, and document stores.

## 5. Goals
- Provide accurate answers based *only* on uploaded documents.
- Ensure high availability of AI services through provider rotation (Groq + OpenRouter).
- Offer a responsive, modern UI with clear feedback states (streaming text, thinking states, context cards).
- Secure user data and isolate context per chat.
- Implement Polyglot Persistence: PostgreSQL for ACID transactions and vector embeddings; MongoDB for conversation telemetry and user feedback ratings.

## 6. User Journey
1. **Onboarding:** User signs up via Email/Password or Google OAuth.
2. **Initialization:** User creates a new Chat session.
3. **Ingestion:** User uploads a document (e.g., PDF). The system quickly acknowledges the upload while processing it asynchronously in the background.
4. **Interaction:** User asks a question about the document. System retrieves relevant chunks, queries the AI pool, and renders an answer with inline citations.
5. **Feedback:** User provides thumbs-up or thumbs-down feedback on the assistant's response, recorded immediately in the MongoDB telemetry store.
6. **Management:** User manages chats (rename, delete) or removes specific documents from a chat. Deleting a chat cleans up both PostgreSQL and MongoDB stores.

## 7. User Stories
- **As a user, I want to securely log in** so my documents and chats remain private.
  - *Implementation Evidence:* `api/src/services/auth.service.ts`, `api/src/routes/auth.routes.ts`, `api/src/middleware/auth.ts`
- **As a user, I want to upload PDFs and Word docs** so I can ask questions about them.
  - *Implementation Evidence:* `multer` config, `api/src/routes/chat.routes.ts`, background ingestion in `document.service.ts`.
- **As a user, I want the AI to cite its sources** so I can trust the answer.
  - *Implementation Evidence:* `api/src/ai/prompt-builder.ts`, `Message` model (`citations` JSON field), `ContextCards.tsx`.
- **As a user, I want to rate answers (thumbs up / down)** to provide quality feedback.
  - *Implementation Evidence:* `web/app/chats/[chatId]/page.tsx` (handleRating), `PATCH /api/chats/:chatId/messages/:messageId/rating`, `api/src/db/mongo.ts`.
- **As a user, I want the system to remain available even if an AI provider goes down** so my work isn't interrupted.
  - *Implementation Evidence:* `api/src/ai/client-pool.ts` (round-robin multi-provider).

## 8. Functional Requirements

### FR-01: Authentication
- **Requirement:** Secure user registration, login, and Google OAuth.
- **Implementation Evidence:** `api/src/routes/auth.routes.ts`, `api/src/services/auth.service.ts`, `api/src/middleware/auth.ts`, `api/src/schemas.ts` (`authSchema`, `loginSchema`).
- **Acceptance Behavior:** Returns JWT (7-day expiry), uses `bcryptjs` (12 rounds) for passwords, validates Google tokens via Google's `tokeninfo` endpoint.

### FR-02: Chat Management
- **Requirement:** CRUD operations for isolated chat sessions.
- **Implementation Evidence:** `api/src/routes/chat.routes.ts`, DB Models (`Chat`, `Message`, `Document`, `ChatMessageDoc`).
- **Acceptance Behavior:** Users can list, create, rename (PATCH), and delete chats. Deleting a chat cascades deletes to PostgreSQL tables and purges corresponding MongoDB audit records.

### FR-03: Document Ingestion
- **Requirement:** Upload, parse, chunk, and embed files asynchronously.
- **Implementation Evidence:** `multer` middleware (MIME/Size limits), `api/src/routes/chat.routes.ts`, Cloudinary storage logic, Vector DB inserts using raw SQL.
- **Acceptance Behavior:** API returns 201 immediately. Background task extracts text (`pdf-parse`, `mammoth`), chunks (2000 chars, 200 overlap), embeds via OpenRouter, and inserts into `DocumentChunk`. Status transitions from PROCESSING to READY.

### FR-04: RAG Querying & Citations
- **Requirement:** Answer questions using top-4 semantic search chunks and multi-provider LLMs.
- **Implementation Evidence:** Raw SQL for Top-4 cosine distance (`<=>`), `api/src/ai/prompt-builder.ts`, `api/src/ai/client-pool.ts`.
- **Acceptance Behavior:** AI answers strictly from evidence, returning a JSON object with `{answer, citations}`. Supports 'concise' and 'explain' modes.

### FR-05: Polyglot Persistence & Message Feedback
- **Requirement:** Track semi-structured conversation records, user ratings, and pipeline latency telemetry in MongoDB without blocking primary transactional workflows.
- **Implementation Evidence:** `api/src/db/mongo.ts`, `api/src/services/message.service.ts` (`logMongoMessage`), `PATCH /api/chats/:chatId/messages/:messageId/rating`.
- **Acceptance Behavior:** Each assistant turn logs embedding latency, retrieval latency, LLM generation time, and provider used into MongoDB. Thumbs-up/down ratings update MongoDB documents in place. Operates with a fail-safe bypass if MongoDB is unreachable.

### FR-06: NoSQL Relationships (Embedding vs Referencing)
- **Requirement:** Demonstrate both Embedding and Referencing relationships in NoSQL document database.
- **Implementation Evidence:** `api/src/db/mongo.ts`.
- **Acceptance Behavior:** `CitationSubSchema` and `RagTelemetrySubSchema` are embedded directly inside `ChatMessageDocSchema`. `MongoChatSession` demonstrates normalized referencing via `lastMessageRef: { type: Schema.Types.ObjectId, ref: "ChatMessage" }` resolved via `.populate()`.

### FR-07: NoSQL Aggregation Pipelines
- **Requirement:** Execute multi-stage analytics aggregation pipelines.
- **Implementation Evidence:** `api/src/db/mongo.ts` (`getChatAnalyticsPipeline`), `api/src/routes/chat.routes.ts` (`GET /api/chats/:chatId/analytics`).
- **Acceptance Behavior:** Multi-stage pipeline (`$match` -> `$group` -> `$project` -> `$sort`) computes average latencies, response counts, and upvote/downvote metrics.

### FR-08: SQL Database ACID Transactions (PostgreSQL)
- **Requirement:** Ensure all-or-nothing transactional consistency for multi-entity operations.
- **Implementation Evidence:** `api/src/services/chat.service.ts` (`deleteChat` using `prisma.$transaction`).
- **Acceptance Behavior:** Atomically deletes document chunks, documents, and messages before deleting the chat; rolls back completely if any step fails.

### FR-09: Input Sanitization & Prompt Injection Awareness and Defenses
- **Requirement:** Sanitize user input against XSS and defend RAG prompts against adversarial injection.
- **Implementation Evidence:** `api/src/middleware/sanitization.ts`, `api/src/routes/chat.routes.ts`.
- **Acceptance Behavior:** Strips script/iframe tags, detects adversarial prompt injection patterns (`ignore previous instructions`, `system override`), and neutralizes special prompt delimiter tokens (`<|im_start|>`, `### System:`).

### FR-10: Caching with Redis & In-Memory Fallback
- **Requirement:** Key-value caching layer with TTL expiration for repeated vector embeddings and queries.
- **Implementation Evidence:** `api/src/db/cache.ts` (using `ioredis`).
- **Acceptance Behavior:** Provides `get`, `set` with TTL, and `del` with automatic fallback to in-memory store if Redis is unavailable.

### FR-11: Scheduled Jobs & Cron Runner
- **Requirement:** Recurring background tasks for system maintenance and telemetry log management.
- **Implementation Evidence:** `api/src/jobs/cron.ts` (using `node-cron`).
- **Acceptance Behavior:** Runs hourly cleanup of expired cache and daily database index maintenance at midnight.

### FR-12: WebSocket / Real-Time Communication
- **Requirement:** Bidirectional WebSocket communication for real-time status events.
- **Implementation Evidence:** `api/src/server.ts` (using `ws` on path `/ws`).
- **Acceptance Behavior:** Upgrades HTTP server to support WebSocket connections and bidirectional ping/pong and event broadcasts.

### FR-13: Function Calling / Tool Use
- **Requirement:** Structured function calling schema declarations compatible with AI agent standards.
- **Implementation Evidence:** `api/src/ai/tools.ts`.
- **Acceptance Behavior:** Declares JSON parameter schemas for `query_document_chunks` and `calculate_reading_time` with dynamic execution dispatch.

## 9. Non-Functional Requirements
- **Performance:** Asynchronous document ingestion prevents blocking the main thread; average RAG response latency under 6 seconds.
- **High Availability & Fault Tolerance:** Multi-provider AI pool automatically falls back to secondary keys/providers on 429/502 errors. Fail-safe bypass on MongoDB prevents analytics logging issues from degrading user-facing chat.
- **Security:** In-memory IP rate limiting, strict Zod environment and body validation, 1MB JSON limit, and token authorization.
- **Scalability:** Polyglot persistence offloads high-volume telemetry and variable citation JSON from the primary transactional PostgreSQL database.

## 10. Scope (Version 1)
- Next.js 15 App Router Frontend (Tailwind, shadcn/ui, Context API) deployed on **Vercel**
- Express 4 Backend with TypeScript deployed on **Render**
- Neon PostgreSQL + Prisma + pgvector
- MongoDB Atlas + Mongoose for telemetry and feedback
- Email/Password + Google OAuth
- PDF, DOCX, TXT, MD document support
- Multi-provider AI pool (Groq, OpenRouter)
- Cloudinary raw and image file storage

## 11. Explicitly Out of Scope
- Real-time token streaming from LLM (currently uses JSON mode which requires full response generation).
- Redis caching or dedicated background job queue workers (uses in-memory maps and detached promises).
- Microservices, Docker, Kubernetes orchestration.
- Subscription/Billing integrations.

## 12. Success Metrics
- Upload processing success rate > 95%.
- LLM query success rate > 99% (enabled by client pool rotation).
- Average query response time < 6 seconds.
- User feedback rating capture rate = 100% when submitted.

## 13. Risks & Mitigations
- **Risk:** Background ingestion fails silently.
  - **Mitigation:** Document model has a `status` field (PROCESSING, READY, FAILED) and `errorMessage` to reflect state in UI.
- **Risk:** AI provider API rate limits.
  - **Mitigation:** Client pool automatically rotates to the next available provider on failure.
- **Risk:** External MongoDB cluster network latency or DNS issues.
  - **Mitigation:** Safe connection error handling and fail-safe bypass wrapper so chat generation never fails if MongoDB is temporarily unavailable.

## 14. Future Roadmap
- Implementation of Redis for distributed rate limiting and BullMQ task queues.
- Server-Sent Events (SSE) for token-by-token streaming.
- Hybrid search (BM25 + pgvector).
