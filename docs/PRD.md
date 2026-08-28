# Product Requirements Document (PRD)

## 1. Executive Summary
rag99 is a robust, full-stack Retrieval-Augmented Generation (RAG) web application that enables users to upload various document types (PDF, Word, Markdown, Text) and converse with an AI assistant grounded in those documents. Built with Next.js 15, Express.js, PostgreSQL (pgvector), and an innovative multi-provider LLM pool, it prioritizes reliability, accuracy, and an excellent user experience.

## 2. Product Vision
To provide a secure, fast, and highly reliable document interaction platform where users can interrogate their own data through an intelligent, context-aware AI, free from provider lock-in or single points of failure.

## 3. Problem Statement
Users often have large documents but struggle to quickly extract specific information or synthesize insights from them. Standard LLMs lack knowledge of user-specific private documents, and many existing RAG solutions are fragile due to single AI provider dependency, slow synchronous file processing, and poor error handling.

## 4. Target Users
1. **Student / Researcher:** Needs to upload lengthy academic papers (PDFs) or class notes (Word/Markdown) and ask questions to prepare for exams or write reports.
2. **Evaluator / Reviewer:** Needs to quickly assess the quality of the system's output, looking at citations and source chunks to verify lack of hallucination.
3. **Maintainer / Developer:** Needs a robust, easy-to-run local environment (using `tsx watch` and `concurrently`) with clear architecture to extend features.

## 5. Goals
- Provide accurate answers based *only* on uploaded documents.
- Ensure high availability of AI services through provider rotation.
- Offer a responsive, modern UI with clear feedback states (streaming text, thinking states).
- Secure user data and isolate context per chat.

## 6. User Journey
1. **Onboarding:** User signs up via Email/Password or Google OAuth.
2. **Initialization:** User creates a new Chat session.
3. **Ingestion:** User uploads a document (e.g., PDF). The system quickly acknowledges the upload while processing it in the background.
4. **Interaction:** User asks a question about the document. System retrieves relevant chunks, queries the AI, and streams back an answer with inline citations.
5. **Management:** User manages chats (rename, delete) or removes specific documents from a chat.

## 7. User Stories
- **As a user, I want to securely log in** so my documents and chats are private.
  - *Implementation Evidence:* `api/src/services/auth.service.ts`, `api/src/routes/auth.routes.ts`, `api/src/middleware/auth.ts`
- **As a user, I want to upload PDFs and Word docs** so I can ask questions about them.
  - *Implementation Evidence:* `multer` config, `api/src/routes/chat.routes.ts` (POST /api/chats/:chatId/documents), background ingestion in background task.
- **As a user, I want the AI to cite its sources** so I can trust the answer.
  - *Implementation Evidence:* `api/src/ai/prompt-builder.ts`, `Message` model (`citations` JSON field).
- **As a user, I want the system to remain available even if an AI provider goes down** so my work isn't interrupted.
  - *Implementation Evidence:* `api/src/ai/client-pool.ts` (round-robin multi-provider).

## 8. Functional Requirements

### FR-01: Authentication
- **Requirement:** Secure user registration, login, and Google OAuth.
- **Implementation Evidence:** `api/src/routes/auth.routes.ts`, `api/src/services/auth.service.ts`, `api/src/middleware/auth.ts`, `api/src/schemas.ts` (`authSchema`, `loginSchema`)
- **Acceptance Behavior:** Returns JWT (7-day expiry), uses `bcryptjs` (12 rounds) for passwords, validates Google tokens via `tokeninfo` endpoint.

### FR-02: Chat Management
- **Requirement:** CRUD operations for isolated chat sessions.
- **Implementation Evidence:** `api/src/routes/chat.routes.ts`, DB Models (`Chat`, `Message`, `Document`).
- **Acceptance Behavior:** Users can list, create, rename (PATCH), and delete chats. Deleting a chat cascades deletes to Messages and Documents.

### FR-03: Document Ingestion
- **Requirement:** Upload, parse, chunk, and embed files asynchronously.
- **Implementation Evidence:** `multer` middleware (MIME/Size limits), `api/src/routes/chat.routes.ts`, Cloudinary storage logic, Vector DB inserts using raw SQL.
- **Acceptance Behavior:** API returns 201 immediately. Background task extracts text (`pdf-parse`, `mammoth`), chunks (2000 chars, 200 overlap), embeds via OpenRouter, and inserts into `DocumentChunk`. Status transitions from PROCESSING to READY.

### FR-04: RAG Querying
- **Requirement:** Answer questions using top-4 semantic search chunks and multi-provider LLMs.
- **Implementation Evidence:** Raw SQL for Top-4 cosine distance (`<=>`), `api/src/ai/prompt-builder.ts`, `api/src/ai/client-pool.ts`.
- **Acceptance Behavior:** AI answers strictly from evidence, returning a JSON object with `{answer, citations}`. Supports 'concise' and 'explain' modes.

## 9. Non-Functional Requirements
- **Performance:** App responds to file uploads quickly by delegating text processing to the background.
- **Reliability:** AI client pool handles 502/rate-limits by rotating keys/providers.
- **Security:** In-memory IP rate limiting, strict Zod env and body validation, 1MB JSON limit.

## 10. Scope (Version 1)
- Next.js 15 App Router Frontend (Tailwind, shadcn, Context API)
- Express 4 Backend with TypeScript
- Neon PostgreSQL + Prisma + pgvector
- Email/Password + Google OAuth
- PDF, DOCX, TXT, MD document support
- Multi-provider AI pool (Groq, OpenRouter)
- Cloudinary raw file storage

## 11. Explicitly Out of Scope
- Real-time streaming tokens from LLM (currently uses JSON mode which requires full response generation).
- Redis caching or message queues (uses in-memory map and detached promises).
- Microservices, Docker, Kubernetes.
- Subscription/Billing integrations.

## 12. Success Metrics
- Upload processing success rate > 95%.
- LLM query success rate > 99% (enabled by client pool rotation).
- Average query response time < 5 seconds.

## 13. Risks & Mitigations
- **Risk:** Background ingestion fails silently.
  - **Mitigation:** Document model has a `status` field (PROCESSING, READY, FAILED) and `errorMessage` to reflect state in UI.
- **Risk:** AI provider API rate limits.
  - **Mitigation:** Client pool automatically rotates to the next available provider on failure.

## 14. Assumptions
- Users have stable internet connections.
- Cloudinary and Neon serverless Postgres provide adequate free-tier limits.
- Node.js environment has sufficient memory for processing medium-sized PDFs and Word docs.

## 15. Future Roadmap
- Implementation of Redis for distributed rate limiting and task queues.
- True Server-Sent Events (SSE) or WebSockets for token-by-token streaming.
- Dockerization of the application.
- Advanced chunking strategies (semantic chunking).
