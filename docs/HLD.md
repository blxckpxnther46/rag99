# rag99 High-Level Design

## System Overview

**rag99** is a TypeScript monorepo with two apps:

- `web/`: Next.js React frontend pages and components.
- `api/`: Express.js REST API backend.
- Business services for authentication, chats, documents, and AI.
- Prisma ORM for PostgreSQL access.
- pgvector for document embedding similarity search.
- Cloudinary raw file storage for uploaded files.
- OpenAI-compatible LLM and embedding API integration.

The system is intentionally modular without microservices. The frontend and backend are separated only because it makes file ownership clearer for a viva and avoids mixing UI code with API code.

High-level behavior:

1. User logs in.
2. User creates a chat.
3. User uploads documents into that chat.
4. Backend extracts text, chunks it, creates embeddings, and stores chunks in PostgreSQL.
5. User asks a question.
6. Backend retrieves relevant chunks from the selected chat.
7. Backend sends only retrieved context to the LLM.
8. Backend stores and returns the AI answer with citations where possible.

## Architecture Diagram

```text
                         +-----------------------------+
                         |          User Browser        |
                         |  Next.js React UI            |
                         |  Tailwind + shadcn/ui        |
                         +--------------+--------------+
                                        |
                                        | HTTPS / REST JSON
                                        v
                         +-----------------------------+
                         |      rag99 Monorepo          |
                         |                             |
                         |  web/: Next.js App Router    |
                         |  api/: Express REST API      |
                         |  Middleware + Services       |
                         +------+----------+-----------+
                                |          |
                  Prisma Client |          | Cloudinary SDK
                                v          v
              +--------------------+   +---------------------+
              | PostgreSQL          |   | Cloudinary           |
              | Prisma tables       |   | rag99/* raw assets   |
              | pgvector extension  |   | Original raw files   |
              +----------+---------+   +---------------------+
                         |
                         | Vector similarity query
                         v
              +----------------------+
              | Relevant chunks      |
              +----------+-----------+
                         |
                         | Prompt with retrieved context
                         v
              +----------------------+
              | OpenAI-compatible    |
              | LLM + Embedding APIs |
              +----------------------+
```

## Component Diagram

```text
Frontend
  Auth Pages
  App Layout
  Sidebar
  Chat Window
  Message List
  Document Panel
  Upload Component
  API Client

Express API Routes
  /api/auth/register
  /api/auth/login
  /api/chats
  /api/chats/:chatId
  /api/chats/:chatId/messages
  /api/documents/chats/:chatId/documents
  /api/documents/:documentId

Middleware
  Request Logger
  Rate Limiter
  Auth Middleware
  Authorization Checks
  Zod Validation
  Global Error Handling

Services
  Auth Service
  Chat Service
  Document Service
  File Storage Service
  Text Extraction Service
  Chunking Service
  Embedding Service
  Retrieval Service
  Prompt Builder
  AI Service

Data Layer
  Prisma Client
  PostgreSQL Tables
  pgvector Similarity Search
```

Each component exists because it maps to a real Version 1 responsibility. No component is added only for future scale.

## User Request Flow

```text
User action
  -> React component event handler
  -> API client fetch call
  -> Express API route
  -> Middleware checks
  -> Zod validation
  -> Service function
  -> Prisma / Cloudinary / AI provider
  -> JSON response
  -> React state update
  -> UI render
```

Example: sending a chat message.

1. User types a question and submits.
2. Frontend shows pending user message and loading state.
3. Frontend sends `POST /api/chats/:chatId/messages`.
4. Backend verifies JWT.
5. Backend verifies the chat belongs to the user.
6. Backend validates request body with Zod.
7. Backend stores the user message.
8. Backend embeds the question.
9. Backend retrieves similar chunks for that chat.
10. Backend builds the prompt.
11. Backend calls the LLM.
12. Backend stores assistant message.
13. Backend returns answer, citations, and confidence.
14. Frontend renders markdown response.

## Authentication Flow

```text
Register (Email/Password)
  -> validate name, email, password
  -> check duplicate email
  -> bcrypt hash password
  -> create user
  -> sign JWT
  -> return token + user

Login (Email/Password)
  -> validate email, password
  -> find user by email
  -> compare password with bcrypt
  -> sign JWT
  -> return token + user

Google Sign-In (OAuth 2.0)
  -> user signs in via Google popup on frontend
  -> Google returns credential (ID token JWT)
  -> frontend sends POST /api/auth/google { credential }
  -> backend validates ID token with Google API
  -> backend finds or creates User (with random password hash)
  -> sign rag99 JWT
  -> return token + user

Protected API
  -> read Authorization: Bearer <token>
  -> verify JWT signature and expiry
  -> attach userId to request context
  -> continue or return 401
```

JWT is chosen because Version 1 needs simple stateless authentication. Server-side sessions are also valid, but they require session storage and more moving pieces. Google OAuth is added alongside standard registration to provide a modern, passwordless authentication pathway, verified directly via Google's tokeninfo endpoint.

## File Upload Flow

```text
User selects file
  -> frontend validates obvious size/type limits
  -> POST multipart/form-data to chat documents endpoint
  -> backend verifies JWT
  -> backend verifies chat ownership
  -> backend validates file type and size
  -> upload original file to Cloudinary as a raw asset (fast)
  -> create Document database row in PROCESSING status
  -> return Document row immediately to frontend (under 1s)

Background Ingestion (Non-blocking)
  -> extract text from buffer
  -> split text into chunks
  -> generate embeddings for chunks
  -> store DocumentChunk rows with pgvector vectors in database
  -> mark Document as READY (or FAILED if extraction/embedding fails)
  -> frontend automatically polls and updates status badge
```

Supported Version 1 files:

- `.pdf`
- `.txt`
- `.md`
- `.docx` if implementation time allows

Maximum size:

- 10 MB per file.
- 5-6 documents per chat.

Cloudinary is selected for Version 1 because it gives rag99 a real cloud storage integration without adding a complex infrastructure stack. To prevent request timeouts, the text extraction, chunking, and embedding generation are offloaded to an asynchronous background worker flow in Node.js. The backend responds immediately with `PROCESSING` status, and the frontend polls for updates.


## AI Request Flow

```text
User question
  -> store user message
  -> generate question embedding
  -> query pgvector for top matching chunks in same chat
  -> apply minimum similarity threshold
  -> construct context block
  -> construct system + user prompt
  -> call OpenAI-compatible LLM endpoint
  -> parse structured response
  -> store assistant message
  -> return answer to frontend
```

The model should not receive all uploaded document text. It should receive only retrieved chunks. This keeps prompts smaller, faster, cheaper, and less likely to contain irrelevant information.

## Data Flow

### Persistent Data

Stored in PostgreSQL:

- users
- chats
- messages
- documents
- document chunks
- embedding vectors through pgvector

Stored on disk:

- original uploaded files

Stored in environment variables:

- database URL
- JWT secret
- AI provider API key
- AI base URL
- LLM model name
- embedding model name
- upload directory

### Ownership Flow

```text
User
  owns Chats
    own Documents
      own Document Chunks
    own Messages
```

All retrieval and document operations must be scoped through chat ownership. This prevents a user from querying another user's documents.

## Deployment Overview

Recommended Version 1 deployment:

- **Railway** for the Next.js app and PostgreSQL database.
- PostgreSQL database with pgvector enabled.
- Local-like persistent upload directory if available in the selected Railway setup.

Alternative:

- Vercel frontend plus Railway backend/database.

Recommendation:

- Start with **Railway as a single deployment target** for Version 1.

Reason:

- rag99 handles uploaded files and document processing.
- A single deployment target is easier to demo and debug.
- Vercel serverless deployments are excellent for frontend-heavy apps, but local uploaded files are not durable in typical serverless runtime storage.

For local development:

- Next.js dev server.
- Local PostgreSQL with pgvector, or hosted Railway PostgreSQL.
- `.env.local` for secrets.

## External Services

### OpenAI-compatible LLM API

Purpose:

- Generate final answers from retrieved document context.

Alternatives:

- Direct OpenAI API.
- OpenRouter/Groq Client Pool.
- Local LLM.

Recommendation:

- Use an OpenAI-compatible API client pool abstraction.

Why:

- The same client shape can work with Groq, OpenRouter, or other compatible providers.
- Local LLM setup adds hardware risk and is not needed for the viva objective.

### OpenAI-compatible Embedding API

Purpose:

- Convert document chunks and user questions into numeric vectors.

Why external:

- Embedding models are specialized.
- Using an API is faster and more reliable for Version 1 than hosting a model locally.

## Technology Stack

| Layer | Recommended Technology | Why it fits rag99 Version 1 |
|---|---|---|
| Frontend | Next.js, React, TypeScript | Clear routing, strong typing, deploys cleanly as `web/` |
| Styling | Tailwind CSS, shadcn/ui | Fast UI development with consistent components |
| Backend | Express.js | Clear REST APIs, middleware, and separate `api/` ownership |
| Validation | Zod | Runtime validation with TypeScript-friendly schemas |
| Auth | JWT, bcrypt | Required, simple, explainable security |
| Database | PostgreSQL | Relational data and SQL JOINs |
| ORM | Prisma | Type-safe schema and migrations |
| Vector Search | pgvector | Embeddings inside PostgreSQL |
| File Storage | Cloudinary raw uploads | Durable cloud storage with simple SDK integration |
| AI | OpenAI-compatible LLM and embedding endpoints | Provider-flexible and demo-friendly |
| Deployment | Vercel for `web/`, Render or Railway for `api/` | Keeps frontend and API deployment responsibilities clear |

## Database Overview

The database models the product directly:

- `User`: registered account.
- `Chat`: document-backed conversation owned by a user.
- `Message`: user or assistant message inside a chat.
- `Document`: uploaded file metadata and processing status.
- `DocumentChunk`: text chunks from a document, including vector embedding.

Why PostgreSQL:

- It handles relational ownership cleanly.
- It supports foreign keys for data integrity.
- It supports SQL JOINs for viva explanation.
- It supports pgvector, avoiding a separate vector database.

Why pgvector:

- Embeddings are arrays of numbers.
- Similarity search finds vectors closest to the question vector.
- pgvector allows this search directly inside PostgreSQL.

Why Prisma:

- Prisma schema makes the data model readable.
- Prisma migrations make schema changes controlled.
- Prisma Client gives TypeScript-safe database access.

## Security Overview

Version 1 security must be simple but real.

### Authentication

- JWT access token signed with `JWT_SECRET`.
- Token sent in `Authorization: Bearer <token>` header.
- Protected APIs reject missing, invalid, or expired tokens.

### Passwords

- Passwords are hashed using bcrypt.
- Plaintext passwords are never stored.

### Authorization

- Every chat, message, document, and chunk operation is scoped by `userId`.
- A valid token is not enough; resource ownership must also be checked.

### Validation

- Zod validates request body, params, and query values.
- Invalid requests return `400 Bad Request` with useful field-level errors.

### Rate Limiting

- Apply basic rate limits to login, registration, upload, and AI message endpoints.
- This protects against brute force login attempts and uncontrolled AI usage.

### Secrets

- API keys, JWT secrets, and database URLs are stored in environment variables.
- Secrets are not committed to source control.

### Input Sanitization

- User text is treated as untrusted input.
- Markdown rendering should use a safe renderer configuration.
- File names should be normalized before saving.

## Design Decisions

### Decision 1: Monorepo with Separate `web/` and `api/`

Alternatives:

- Full-stack Next.js app.
- Monorepo with Next.js frontend and Express backend.

Trade-offs:

- A full-stack Next.js app reduces runtime pieces but mixes backend ownership into frontend folders.
- Separate `web/` and `api/` folders add one CORS boundary but make the viva structure easier to explain.

Recommendation:

- Use a monorepo with `web/` for Next.js and `api/` for Express.

Why for rag99:

- It keeps frontend and backend concerns visibly separate without microservices.
- It demonstrates backend concepts through Express routes, services, middleware, validation, and status codes.

### Decision 2: PostgreSQL plus pgvector Instead of a Dedicated Vector Database

Alternatives:

- Pinecone, Weaviate, Qdrant, or Chroma.
- PostgreSQL with pgvector.

Trade-offs:

- Dedicated vector databases offer advanced vector features and scale.
- They add another service, another SDK, another deployment dependency, and more viva complexity.

Recommendation:

- Use PostgreSQL with pgvector.

Why for rag99:

- Version 1 has small document volume.
- One database can handle users, chats, documents, messages, and vector search.
- It naturally demonstrates both relational and vector concepts.

### Decision 3: Cloudinary Raw Storage Instead of Local Disk

Alternatives:

- AWS S3, Cloudinary, Supabase Storage, or similar cloud object storage.
- Local filesystem.
- Database BLOBs.

Trade-offs:

- Cloudinary adds account credentials and quotas but is simpler than setting up S3 buckets and IAM.
- Local storage is simplest locally but unreliable on many deployments.
- Database BLOBs simplify deployment but bloat the database.

Recommendation:

- Use Cloudinary raw file storage for Version 1.

Why for rag99:

- It improves deployment safety and viva scoring with a real cloud service.
- It only touches the storage service; RAG parsing, chunking, embeddings, and retrieval stay unchanged.

### Decision 4: Synchronous Document Processing for Version 1

Alternatives:

- Process uploads synchronously in the request.
- Use background jobs and queues.

Trade-offs:

- Background jobs improve reliability for large workloads but require Redis or a queue worker.
- Synchronous processing is simpler but can make uploads take longer.

Recommendation:

- Use synchronous processing with clear loading state and file size limits.

Why for rag99:

- Only 5-6 small documents are expected.
- Avoiding a queue keeps Version 1 realistic for one developer.

Skipped:

- Redis queue.

Add when:

- Upload processing becomes slow enough to block user experience or deployment timeouts.

### Decision 5: Structured AI Response Instead of Free-form Only

Alternatives:

- Plain text response.
- Structured JSON response containing answer, citations, and confidence.

Trade-offs:

- Plain text is easier but harder to render consistently.
- Structured output needs prompt discipline and response parsing.

Recommendation:

- Ask the LLM for structured output.

Why for rag99:

- The frontend can render citations predictably.
- It demonstrates structured outputs for the AI rubric.

### Decision 6: Basic Similarity Search Instead of Hybrid Search

Alternatives:

- Vector-only search.
- Keyword search.
- Hybrid search.

Trade-offs:

- Hybrid search is better for exact terms but requires more query logic.
- Vector-only search is enough to demonstrate RAG clearly.

Recommendation:

- Use vector-only search in Version 1.

Why for rag99:

- It is simpler and sufficient for 5-6 uploaded documents.
- Hybrid search belongs in Version 2.

## Design Trade-offs

| Area | Version 1 Choice | Benefit | Cost | Future Upgrade |
|---|---|---|---|---|
| App structure | `web/` + `api/` monorepo | Clear ownership and viva explanation | Requires CORS config | Deploy independently later if needed |
| File processing | Synchronous | Simple implementation | Uploads may wait | Background queue |
| Storage | Cloudinary raw files | Durable uploads and better deployment story | Free-plan quota limits | Signed URLs or S3 if needed |
| Search | pgvector only | Simple RAG explanation | Weaker exact keyword matching | Hybrid search |
| Auth | JWT | Simple stateless APIs | Token invalidation is basic | Refresh tokens or sessions |
| AI response | Structured JSON | Predictable UI | Needs parsing fallback | Provider-native schema mode |
| Deployment | Vercel frontend + Render/Railway backend | Clear platform fit | Two deploy targets | Add CI/CD later |

## Version 1 Boundaries

rag99 Version 1 should not include:

- Microservices.
- Kubernetes.
- Redis.
- Background workers.
- Complex role systems.
- Organization accounts.
- OCR.
- Graph RAG.
- Multi-agent systems.

These are valid future features, but they do not improve the core Version 1 demo enough to justify the added implementation and explanation cost.

## Final Quality Checklist

- Every major component has a clear purpose.
- Every technology choice is compared against alternatives.
- The architecture remains one-developer friendly.
- The system demonstrates the required evaluation concepts naturally.
- The design supports future growth without forcing Version 1 complexity.
