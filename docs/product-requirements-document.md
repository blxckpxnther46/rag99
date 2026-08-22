# rag99 Product Requirements Document

## Executive Summary

**rag99** is an AI-powered document knowledge assistant for college project demonstration and viva evaluation. Users register, log in, create chats, upload 5-6 documents per chat, and ask questions grounded in those uploaded documents.

The product is intentionally scoped as a realistic Version 1 application for one developer. It demonstrates strong fundamentals across AI, backend, frontend, database design, authentication, validation, security, and clean architecture without adding enterprise complexity.

The core product rule is:

> Retrieve first. Generate second. Trust evidence over confidence.

If relevant evidence is found, rag99 answers using that evidence and includes citations where possible. If evidence is weak or missing, rag99 clearly says it cannot answer confidently from the uploaded documents.

## Vision

rag99 should feel familiar like ChatGPT or Gemini, but its knowledge comes from documents uploaded into each chat.

The long-term vision is a personal and academic knowledge assistant that can grow from simple document Q&A into a larger knowledge platform. Version 1 focuses only on the minimum complete product that is technically correct, explainable in a viva, and buildable in a few days.

## Problem Statement

Students, researchers, and project evaluators often need to ask questions across multiple documents. Basic PDF chat apps usually feel narrow, lack clear architecture, and often generate answers without reliable grounding.

rag99 solves this by:

- organizing documents inside individual chats,
- retrieving relevant document chunks before generation,
- storing conversation history,
- separating authentication, chat, document, and AI responsibilities,
- using PostgreSQL, Prisma, and pgvector to demonstrate relational and vector database concepts clearly.

## Goals

### Must Have

- Allow users to register and log in securely.
- Allow users to create, rename, delete, and view chats.
- Allow each chat to own its uploaded documents.
- Allow users to upload, view, and delete documents.
- Extract text from uploaded documents.
- Split extracted text into chunks.
- Generate embeddings for chunks.
- Store chunks and embeddings in PostgreSQL using pgvector.
- Retrieve relevant chunks for every user question.
- Send retrieved context to an LLM through an OpenAI-compatible API.
- Generate markdown answers with citations where possible.
- Store user messages and AI responses.
- Provide loading, typing, empty, and error states.
- Validate request bodies, query parameters, and route parameters with Zod.
- Protect private routes using JWT authentication.
- Use bcrypt for password hashing.
- Use rate limiting and input validation for basic abuse protection.

### Should Have

- Suggested questions after documents are uploaded.
- Clear uncertainty response when evidence is insufficient.
- Clean sidebar with chat history.
- Document management inside each chat.
- Responsive UI for desktop and mobile.
- Structured AI response format for answer, citations, and confidence.

### Could Have

- Basic token usage tracking.
- Basic unit or API tests for critical flows.
- Streaming AI responses if implementation time allows.

### Won't Have in Version 1

- Microservices.
- Kubernetes.
- Redis.
- Docker-first local setup.
- Multi-user workspaces.
- Role-based access control.
- OCR.
- Website crawling.
- GitHub repository indexing.
- Graph RAG.
- Multi-agent systems.
- Advanced analytics.

Reason: these features are useful later, but they increase build time and explanation complexity without improving the core viva objective enough for Version 1.

## Product Philosophy

rag99 prioritizes correctness and explainability over feature volume.

Every major behavior should be easy to explain:

- Authentication proves secure user access.
- Chats prove problem modeling.
- Documents prove file handling.
- Chunks and embeddings prove RAG architecture.
- pgvector proves vector search inside PostgreSQL.
- Zod proves request validation.
- Middleware proves backend structure.
- React state and routing prove frontend fundamentals.

The product should avoid pretending to be more advanced than it is. A reliable small system is better than a complex incomplete one.

## Target Audience

### Primary Audience

- College project evaluators and viva panel members.
- The student developer implementing and explaining the system.

### Secondary Audience

- Students who want to query notes, PDFs, assignments, or reference documents.
- Small academic teams who need lightweight document Q&A.

## User Personas

### Persona 1: Student User

- Needs to upload notes, PDFs, and text documents.
- Wants quick answers grounded in those materials.
- Values simple UI and reliable citations.

### Persona 2: Viva Evaluator

- Evaluates software engineering fundamentals.
- Looks for authentication, APIs, database modeling, validation, security, and AI integration.
- Values clear reasoning more than advanced feature count.

### Persona 3: Developer Maintainer

- Builds and explains the project alone.
- Needs a modular codebase that can be implemented quickly.
- Needs architecture simple enough to debug during demo preparation.

## User Journey

1. User opens rag99.
2. User registers or logs in.
3. User lands on the main chat interface.
4. User creates a new chat.
5. User uploads 5-6 documents into that chat.
6. rag99 validates files, stores them locally, extracts text, chunks text, creates embeddings, and stores vectors.
7. User asks a question.
8. rag99 embeds the question and retrieves relevant chunks from that chat only.
9. rag99 sends the retrieved context and user question to the LLM.
10. rag99 displays a markdown answer with citations when available.
11. User continues the conversation.
12. User can rename or delete the chat, or manage uploaded documents.

## User Stories

### Authentication

- As a new user, I want to register so that my chats and documents are private.
- As a returning user, I want to log in so that I can access my previous chats.
- As a user, I want protected routes so that other users cannot access my data.

### Chat Management

- As a user, I want to create multiple chats so that I can organize different document sets.
- As a user, I want to rename a chat so that I can identify it later.
- As a user, I want to delete a chat so that I can remove old conversations and documents.
- As a user, I want to see chat history in a sidebar so that navigation feels familiar.

### Document Management

- As a user, I want to upload documents to a chat so that rag99 can answer from them.
- As a user, I want to see uploaded documents so that I know what knowledge base the chat uses.
- As a user, I want to delete documents so that outdated files are no longer used.
- As a user, I want upload errors to be clear so that I can fix unsupported files or large files.

### AI Chat

- As a user, I want to ask questions about uploaded documents.
- As a user, I want answers grounded in document evidence.
- As a user, I want citations so that I can verify where the answer came from.
- As a user, I want rag99 to say when evidence is missing instead of hallucinating.
- As a user, I want markdown responses for readable explanations, lists, and code snippets.

### Frontend Experience

- As a user, I want loading states so that I know when work is happening.
- As a user, I want typing indicators so that AI response generation feels active.
- As a user, I want error states so that failures are understandable.
- As a mobile user, I want the UI to remain usable on small screens.

## Functional Requirements

### Authentication

| Priority | Requirement | Reason |
|---|---|---|
| Must | User registration with email, name, and password | Required for private user-owned data |
| Must | User login with JWT response | Demonstrates API authentication |
| Must | Google OAuth login and registration | Provides modern OAuth authentication flow |
| Must | bcrypt password hashing | Prevents storing plaintext passwords |
| Must | Protected frontend routes | Prevents unauthenticated access to app pages |
| Must | Authentication middleware | Centralizes JWT verification |
| Should | Logout by deleting client token | Simple and enough for Version 1 |

### Chat Management

| Priority | Requirement | Reason |
|---|---|---|
| Must | Create chat | Core container for documents and messages |
| Must | List user chats | Required for sidebar history |
| Must | Rename chat | Required Version 1 feature |
| Must | Delete chat | Required Version 1 feature |
| Must | Enforce user ownership | Prevents cross-user access |

### Document Management

| Priority | Requirement | Reason |
|---|---|---|
| Must | Upload documents per chat | Core knowledge base behavior |
| Must | Store uploaded files on Cloudinary raw storage | Secure and durable cloud-based storage |
| Must | Asynchronous document processing | Moves heavy text extraction & embedding to the background |
| Must | Validate file type and size | Prevents unsupported and unsafe uploads |
| Must | Extract text | Required before chunking and embeddings |
| Must | Store document metadata | Supports document list and citations |
| Must | Delete documents and related chunks | Keeps retrieval accurate |
| Should | Show processing status | Helps user understand indexing progress |


Recommended Version 1 file support:

- `.pdf`
- `.txt`
- `.md`
- `.docx` if time allows

Recommended maximum file size:

- 10 MB per file
- 5-6 files per chat

Reason: enough for a college demo while keeping parsing and cost predictable.

### AI Chat

| Priority | Requirement | Reason |
|---|---|---|
| Must | Store user messages | Required conversation history |
| Must | Generate query embedding | Required for vector retrieval |
| Must | Retrieve chunks scoped to current chat | Prevents data leakage and wrong answers |
| Must | Build prompt from retrieved context only | Reduces hallucination |
| Must | Call OpenAI-compatible LLM endpoint | Demonstrates LLM API integration |
| Must | Store assistant response | Required conversation persistence |
| Must | Return citations when chunks support answer | Improves trust and viva explanation |
| Should | Return structured AI output | Makes frontend rendering predictable |
| Should | Suggested questions | Improves first-use experience |

### Validation

| Priority | Requirement | Reason |
|---|---|---|
| Must | Validate request bodies with Zod | Prevents malformed data |
| Must | Validate route params with Zod | Prevents invalid IDs |
| Must | Validate query params with Zod | Covers rubric and avoids unsafe filters |
| Must | Return meaningful validation errors | Improves debugging and user feedback |

### Security

| Priority | Requirement | Reason |
|---|---|---|
| Must | JWT auth | Simple stateless auth for Version 1 |
| Must | bcrypt hashing | Password security |
| Must | Rate limiting | Basic brute-force and abuse protection |
| Must | Environment variables | Keeps secrets outside code |
| Must | Input validation | Prevents malformed and risky inputs |
| Must | Authorization checks | Ensures users access only their data |
| Should | Basic input sanitization | Reduces unsafe rendered content risk |

## Non-functional Requirements

| Priority | Requirement | Target |
|---|---|---|
| Must | Buildability | One developer can build Version 1 in hours to a few days |
| Must | Maintainability | Clear folders for routes, services, repositories, and UI components |
| Must | Reliability | Clear error handling for auth, upload, parsing, AI, and database failures |
| Must | Security | No plaintext passwords, no hardcoded secrets, protected private data |
| Must | Performance | Retrieval should run within a few seconds for 5-6 documents |
| Should | Responsiveness | UI works on laptop and mobile widths |
| Should | Explainability | Every major flow can be described in viva |

## Scope

### In Scope for Version 1

- Next.js frontend.
- TypeScript across the app.
- React components and hooks.
- REST APIs.
- JWT authentication.
- bcrypt password hashing.
- Zod validation.
- PostgreSQL database.
- Prisma ORM.
- pgvector for embeddings.
- Cloudinary raw file storage.
- Document parsing and chunking.
- Embedding generation.
- Vector similarity search.
- LLM answer generation.
- Markdown response rendering.
- Basic security middleware.
- Loading, empty, and error states.

### Out of Scope for Version 1

- Real-time collaboration.
- Organization accounts.
- Admin dashboard.
- Payment system.
- Local-only file storage.
- OCR for scanned PDFs.
- Audio or video uploads.
- Browser extension.
- Native mobile app.
- Advanced observability platform.

## Technology Decisions

### Frontend Framework

Alternatives:

- Plain React with Vite: simpler frontend setup, but needs more routing and deployment glue.
- Next.js: provides file-based routing, strong React defaults, and a smooth Vercel deployment path.
- Angular: structured but heavier for a one-developer college project.

Recommendation:

- Use **Next.js with React and TypeScript**.

Why for rag99 Version 1:

- Keeps the frontend organized without custom routing setup.
- Works cleanly inside the `web/` workspace.
- Demonstrates React, routing, async fetching, and API design cleanly.

### Backend Approach

Alternatives:

- Express.js backend: clear REST structure, familiar middleware, and easy viva explanation.
- Full-stack Next.js backend: fewer moving pieces, but mixes API ownership into the frontend app.

Recommendation:

- Use **Express.js** in the `api/` workspace for Version 1.

Why for rag99 Version 1:

- The `web/` and `api/` folders make the project easier to navigate.
- Express naturally demonstrates REST APIs, middleware, validation, error handling, and status codes.
- It is still simple enough for one developer because it remains one repository with npm workspaces.

### Database

Alternatives:

- MongoDB: flexible documents, but weaker fit for relational ownership and required PostgreSQL rubric.
- SQLite: simple local setup, but not ideal for pgvector or deployment.
- PostgreSQL: relational, production-ready, supports pgvector.

Recommendation:

- Use **PostgreSQL**.

Why for rag99 Version 1:

- Natural fit for users, chats, messages, documents, and chunks.
- Supports SQL JOINs and PK/FK relationships.
- pgvector allows vector search without adding a separate vector database.

### ORM

Alternatives:

- Raw SQL: transparent but more error-prone and slower to implement.
- Drizzle: lightweight and type-safe, but Prisma is easier for beginners.
- Prisma: schema-first ORM with migrations and strong TypeScript support.

Recommendation:

- Use **Prisma ORM**.

Why for rag99 Version 1:

- Makes relational modeling easier to explain.
- Generates type-safe database client.
- Migrations are straightforward for a college project.

### Vector Storage

Alternatives:

- Separate vector database: powerful but adds another service.
- Store embeddings as JSON: simple but poor for similarity search.
- pgvector: vector search inside PostgreSQL.

Recommendation:

- Use **pgvector**.

Why for rag99 Version 1:

- Covers vector database concepts with one database.
- Avoids extra infrastructure.
- Keeps document chunks connected to relational data.

### AI Provider

Alternatives:

- Direct OpenAI API: mature and well documented.
- OpenRouter/Groq Pool: provides rotation and high reliability.
- Local LLM: avoids API dependency but adds hardware and setup risk.

Recommendation:

- Use an **OpenAI-compatible LLM and embedding endpoint**, with provider configured through environment variables.

Why for rag99 Version 1:

- Keeps code provider-flexible.
- Allows OpenRouter/Groq or another OpenAI-compatible endpoint without changing app architecture.
- Easier to demo than local model setup.

### File Storage

Alternatives:

- Cloudinary raw storage: durable cloud storage with a simple SDK and free plan limits suitable for a viva demo.
- Database BLOB storage: simple in one system, but inefficient and not ideal for large files.
- Local storage: easiest locally, but weak for deployment because server disks may be temporary.

Recommendation:

- Use **Cloudinary raw file storage** for Version 1.

Why for rag99 Version 1:

- Adds a visible cloud integration that improves viva scoring without changing the RAG pipeline.
- Avoids server-disk durability problems during deployment.
- PostgreSQL still stores metadata, chunks, and embeddings; Cloudinary only stores the original uploaded file.

### Deployment

Alternatives:

- Vercel only: great for Next.js, but the Express API and document processing are clearer as a separate backend.
- Render: supports long-running Node app and PostgreSQL add-ons.
- Railway: simple app and database deployment, good developer experience.

Recommendation:

- Use **Railway** for the full Version 1 deployment if persistent local-like storage and PostgreSQL are needed.
- Use **Vercel for frontend plus Railway for backend/database** only if the project is split later.

Why for rag99 Version 1:

- A single deploy target is simpler for one developer.
- Railway works better with file upload processing and PostgreSQL than a purely serverless setup.

## Assumptions

- Users upload mostly text-based PDFs, text files, Markdown files, or DOCX files.
- Each chat contains about 5-6 documents.
- Version 1 is used by a small number of users during demo and testing.
- API keys are available for an OpenAI-compatible LLM and embedding model.
- The developer can run PostgreSQL with pgvector locally or through a hosted provider.
- Uploaded files are private to the user who owns the chat.

## Constraints

- Must be buildable by one developer.
- Must remain simple enough for college viva explanation.
- Must use PostgreSQL and Prisma.
- Must use pgvector for embeddings.
- Must implement JWT and bcrypt.
- Must validate requests with Zod.
- Must not rely on microservices, Kubernetes, Redis, or distributed systems in Version 1.
- Must not hallucinate when evidence is missing.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| PDF text extraction fails for scanned files | User gets weak answers | State that OCR is Version 2; show clear extraction errors |
| LLM API fails or rate limits | Chat cannot answer | Show API error state and allow retry |
| Embedding model changes dimensions | Database insert/search fails | Store embedding model name and configure dimension once |
| Large files slow processing | Bad UX | Enforce 10 MB file limit and show processing state |
| Hallucinated answers | Loss of trust | Prompt model to answer only from context and include uncertainty behavior |
| User accesses another user's chat | Security issue | Enforce authorization at every chat/document/message endpoint |
| Cloudinary free-plan limits | Upload failure or quota pressure | Keep Version 1 file size at 10 MB and use 5-6 documents per chat |

## Acceptance Criteria

### Authentication

- A new user can register.
- A registered user can log in.
- Passwords are stored as bcrypt hashes.
- Invalid login returns `401 Unauthorized`.
- Protected APIs reject missing or invalid JWTs.

### Chat

- Authenticated users can create chats.
- Sidebar lists only the logged-in user's chats.
- Users can rename and delete their own chats.
- Users cannot access another user's chats.

### Documents

- Users can upload supported files to a chat.
- Unsupported files are rejected with a clear validation error.
- Oversized files are rejected.
- Uploaded documents appear in the chat document list.
- Deleting a document removes it from retrieval.

### RAG

- Uploaded text is chunked and embedded.
- User question is embedded.
- Retrieval only searches chunks from the selected chat.
- AI response is generated from retrieved context.
- If retrieved context is insufficient, response clearly says so.
- Citations are shown when source chunks are used.

### Frontend

- Login and registration pages work.
- Main app layout has a sidebar and chat area.
- Chat history persists after refresh.
- Loading, typing, empty, and error states are visible where appropriate.
- UI works on common desktop and mobile viewport sizes.

### Backend

- APIs return correct HTTP status codes.
- Zod validation errors are meaningful.
- Global error handler prevents leaking secrets.
- Logging middleware records useful request information.
- Environment variables hold secrets and model configuration.

## Success Metrics

### Product Metrics

- User can complete the full journey from registration to AI answer without manual database work.
- A chat with 5-6 documents can answer document-specific questions.
- Answers include citations when evidence is available.
- Insufficient-evidence cases are handled honestly.

### Engineering Metrics

- Core flows are separated into clear modules.
- Database schema uses PK/FK relationships correctly.
- Prisma models clearly represent users, chats, messages, documents, and chunks.
- RAG pipeline is explainable step by step.
- The app demonstrates required rubric concepts naturally.

### Viva Metrics

- The developer can explain why PostgreSQL, Prisma, pgvector, JWT, bcrypt, Zod, and Next.js were selected.
- The developer can explain embeddings and similarity search in beginner-friendly terms.
- The developer can trace one request from frontend click to database and AI response.
- The developer can describe current limitations and future roadmap honestly.

## Version Roadmap

### Version 1

Focus: complete working college-project product.

- Authentication.
- Chat management.
- Document upload and management.
- Text extraction.
- Chunking.
- Embeddings.
- pgvector retrieval.
- LLM answer generation.
- Citations.
- Conversation history.
- Responsive ChatGPT-like UI.
- Validation, middleware, error handling, and rate limiting.

### Version 1.5

Focus: polish and reliability after the core product works.

- Streaming responses.
- Basic token usage logging.
- Basic API tests for auth, chat, upload, and AI flows.
- Better document processing progress UI.
- Docker for local setup if deployment/demo needs repeatability.
- CI checks if the project is being presented from a repository.

### Version 2

Focus: broader document intelligence.

- OCR for scanned PDFs.
- Hybrid search combining keyword search and vector search.
- Website crawling.
- GitHub repository indexing.
- More advanced storage policies, such as signed download URLs and retention rules.
- Redis caching if repeated retrieval or session workloads justify it.
- Monitoring and analytics.

### Version 3

Focus: collaborative and advanced AI platform.

- Graph RAG.
- Multi-agent workflows.
- Role-based access control.
- Multi-user workspaces.
- Advanced admin dashboard.
- Team-level knowledge bases.
- Fine-grained document permissions.

## Future Scope

Future versions should improve rag99 only after Version 1 is stable.

The most valuable next improvements are:

- OCR, because many academic PDFs are scanned.
- Hybrid search, because exact keywords often matter in technical documents.
- Streaming responses, because users expect faster perceived response time.
- Signed Cloudinary download URLs and retention policies.
- Monitoring, because AI failures and costs need visibility in real usage.

These are not Version 1 requirements because they increase implementation complexity and do not change the core proof of RAG architecture.

## Final Quality Checklist

- Every requirement has a reason.
- Every selected technology is justified against alternatives.
- Version 1 remains simple and realistic for one developer.
- The product naturally covers the required evaluation rubric.
- The documentation supports college viva explanation.
- The architecture can evolve later without forcing a rewrite.
