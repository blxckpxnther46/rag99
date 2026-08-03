# rag99 Backend Architecture & Development Plan

## Backend Architecture

rag99 uses **Express.js** as the backend API layer inside the `api/` workspace.

The backend is organized into:

- Express routes for HTTP,
- middleware for cross-cutting concerns,
- services for business logic,
- repositories for database access where queries become non-trivial,
- Prisma for PostgreSQL access,
- small AI and document modules for RAG-specific work.

Alternatives considered:

- Express.js: clear backend separation, familiar middleware, and direct REST API structure.
- Full-stack Next.js backend: fewer runtime pieces, but mixes backend files into the frontend app.

Recommendation:

- Use Express.js for Version 1.

Reason:

- `web/` and `api/` make the project easier to navigate and explain.
- REST concepts, middleware, validation, HTTP status codes, and backend architecture are directly demonstrated.

## Folder Structure

```text
api/src/
  app.ts
  server.ts
  config.ts
  schemas.ts
  routes/
    auth.routes.ts
    chat.routes.ts
    document.routes.ts
  services/
    auth.service.ts
    chat.service.ts
    document.service.ts
    message.service.ts
  middleware/
    auth.ts
    rate-limit.ts
    error.ts
  http/
    errors.ts
  documents/
    file-storage.ts
    extract-text.ts
    chunk-text.ts
  ai/
    ai-client.ts
    embeddings.ts
    retrieval.ts
    prompt-builder.ts
```

## Controllers

In Express, route files act as controllers.

Controller responsibilities:

- read request,
- call auth/rate-limit/validation helpers,
- call service,
- return JSON response with correct status.

Controllers should not:

- contain SQL,
- build prompts,
- parse documents,
- hash passwords directly,
- perform business rules inline.

Reason:

- Thin Express routes are easier to test and explain.

## Services

Services contain business logic.

| Service | Purpose |
|---|---|
| `auth.service.ts` | register, login, password checks, token issuing |
| `chat.service.ts` | create, list, rename, delete chats |
| `document.service.ts` | upload, validate, parse, chunk, embed, delete documents |
| `message.service.ts` | store user message, retrieve chunks, call AI, store assistant response |

Services are the right place for ownership checks because authorization is a business rule, not just HTTP plumbing.

## Repository Layer

Use repositories only where they reduce repeated Prisma logic.

Examples:

- `findChatForUser(chatId, userId)`
- `listChatsByUser(userId)`
- `insertDocumentChunks(chunks)`
- `searchChunksByVector(chatId, embedding)`

Do not create repositories for one-line Prisma calls unless they avoid duplication.

Reason:

- Version 1 benefits from some separation, but a repository class for every table would be unnecessary boilerplate.

## Database Layer

Use Prisma Client from a single shared module:

```ts
export const prisma = globalThis.prisma ?? new PrismaClient();
```

Purpose:

- avoids too many Prisma clients during development hot reload,
- centralizes database access setup.

PostgreSQL stores:

- users,
- chats,
- messages,
- documents,
- chunks,
- embeddings through pgvector.

Raw SQL is only needed for vector similarity search because Prisma does not fully model pgvector operators.

## Authentication

Authentication uses:

- email/password login,
- bcrypt password hashing,
- JWT access tokens.

Register flow:

1. Validate request with Zod.
2. Check duplicate email.
3. Hash password.
4. Create user.
5. Sign JWT.
6. Return user and token.

Login flow:

1. Validate request.
2. Find user by email.
3. Compare password with bcrypt.
4. Sign JWT.
5. Return user and token.

## JWT Flow

JWT claims:

- `sub`: user ID,
- `email`: user email,
- `iat`: issued at,
- `exp`: expiration.

Use:

- `JWT_SECRET`,
- 24-hour expiry for Version 1.

Authorization header:

```text
Authorization: Bearer <token>
```

Alternative:

- HttpOnly cookie sessions.

Decision:

- JWT bearer token is simpler for Version 1 APIs and easier to demonstrate in tools like Postman.

## Password Hashing

Use bcrypt.

Rules:

- never store plaintext passwords,
- never return `passwordHash` from APIs,
- use bcrypt cost factor 10 or 12.

Alternative:

- Argon2.

Decision:

- Argon2 is strong, but bcrypt is widely understood and enough for this project.

## Middleware

### Auth Middleware

Purpose:

- verify JWT,
- attach authenticated user ID to request context.

Returns:

- `401 Unauthorized` for missing, invalid, or expired tokens.

### Authorization Middleware / Helper

Purpose:

- verify user owns requested chat/document.

Returns:

- `403 Forbidden` if resource exists but is not owned by user,
- `404 Not Found` if hiding resource existence is preferred.

For Version 1, use `404` for non-owned resources to avoid leaking IDs.

### Validation Middleware

Purpose:

- validate body, params, and query with Zod.

Returns:

- `400 Bad Request` with field-level errors.

### Logging Middleware

Purpose:

- log method, path, userId, status, duration.

Do not log:

- passwords,
- tokens,
- API keys,
- full prompts,
- full document text.

### Rate Limit Middleware

Apply to:

- login,
- register,
- upload,
- message generation.

Version 1 can use in-memory rate limiting.

Trade-off:

- In-memory limits reset on restart and do not work across multiple instances.
- Redis is better later, but not needed for a single-instance college demo.

## Validation

Use Zod for:

- request bodies,
- route params,
- query params.

Schemas:

- `registerSchema`
- `loginSchema`
- `createChatSchema`
- `updateChatSchema`
- `chatParamsSchema`
- `sendMessageSchema`
- `documentParamsSchema`
- `listQuerySchema`

Purpose:

- avoids invalid input reaching services,
- demonstrates validation clearly,
- keeps error responses consistent.

## File Upload Service

Responsibilities:

- validate file count,
- validate MIME type and extension,
- validate size,
- generate safe stored filename,
- upload file to Cloudinary raw storage,
- create document metadata,
- trigger parsing and indexing,
- delete Cloudinary assets on document/chat deletion.

Cloudinary public ID shape:

```text
rag99/{userId}/{chatId}/{documentId}-{safeFileName}
```

Safety rules:

- keep Cloudinary credentials in backend environment variables,
- upload as `resource_type: raw`,
- normalize filenames,
- use UUIDs in stored names,
- block path traversal,
- use signed/protected delivery if direct downloads are added later.

## AI Service

Responsibilities:

- call chat completion endpoint,
- request structured response,
- handle provider errors,
- normalize output for frontend.

The AI service should not know about HTTP requests. It receives prompt data and returns model output.

## Embedding Service

Responsibilities:

- call embedding endpoint,
- batch chunk embeddings when practical,
- validate vector dimension,
- return numeric arrays.

Configuration:

- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_EMBEDDING_MODEL`
- `EMBEDDING_DIMENSION`

## Vector Search

Use pgvector through parameterized raw SQL.

Search constraints:

- always filter by `chatId`,
- only use chunks from `READY` documents,
- order by vector distance,
- limit top results, recommended top 5.

Purpose:

- prevents cross-chat leakage,
- keeps context small,
- improves answer grounding.

## Prompt Builder

Responsibilities:

- format retrieved chunks,
- include citation identifiers,
- include user question,
- enforce uncertainty behavior,
- request structured JSON.

Prompt rules:

- answer only from retrieved context,
- do not invent citations,
- say when evidence is insufficient,
- keep answer concise unless user asks for detail.

## Chat Service

Responsibilities:

- list chats,
- create chat,
- rename chat,
- delete chat,
- fetch chat with messages and documents,
- enforce user ownership.

Delete chat flow:

1. Verify ownership.
2. Read Cloudinary public IDs.
3. Delete database chat with cascade.
4. Delete Cloudinary raw assets.
5. Log cleanup failures.

## Logging

Use simple server logs for Version 1:

- request start/end,
- upload processing success/failure,
- AI provider error,
- document parsing failure.

Avoid a full observability stack in Version 1.

Add monitoring when:

- the app has real users,
- AI cost or failure rate needs tracking.

## Error Handling

Use consistent API response shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {}
  }
}
```

Status code rules:

- `400`: invalid request.
- `401`: missing/invalid auth.
- `403`: authenticated but forbidden.
- `404`: resource not found.
- `409`: conflict, such as duplicate email or no ready documents.
- `413`: file too large.
- `415`: unsupported file type.
- `422`: valid upload but unreadable content.
- `429`: rate limited.
- `500`: unexpected server error.
- `502`: AI provider failure.

## Security

Required Version 1 controls:

- JWT authentication.
- bcrypt password hashing.
- resource ownership checks.
- Zod validation.
- rate limiting.
- sanitized filenames.
- Cloudinary credentials stored only in backend env.
- environment variables for secrets.
- safe markdown rendering on frontend.

Security decisions:

- JWT is chosen for simple stateless APIs.
- bcrypt is chosen because it is proven and easy to explain.
- Cloudinary is acceptable for Version 1 because files are small and the free plan fits a viva demo.
- rate limiting is basic in-memory for Version 1; Redis can replace it later.

## Rate Limiting

Recommended limits:

- login: 5 attempts per minute per IP/email.
- register: 5 attempts per minute per IP.
- upload: 10 requests per minute per user.
- AI messages: 20 requests per hour per user for demo control.

Reason:

- protects auth and AI-cost endpoints without adding Redis.

## Development Phases

### Phase 1: Database and Auth

- Prisma schema.
- migrations.
- register/login APIs.
- JWT helper.
- bcrypt helper.
- auth middleware.

### Phase 2: Chat APIs

- create/list/get/rename/delete chats.
- ownership checks.
- basic message listing.

### Phase 3: Document APIs

- upload validation.
- Cloudinary raw file storage.
- document metadata.
- document delete.

### Phase 4: RAG Backend

- text extraction.
- chunking.
- embeddings.
- pgvector insert/search.
- prompt builder.
- LLM response.

### Phase 5: Hardening

- rate limiting.
- consistent errors.
- request logging.
- critical tests.
- README setup instructions.

## Milestones

| Milestone | Done When |
|---|---|
| Auth backend | Register/login/protected API work |
| Chat backend | User can manage owned chats |
| Document backend | Upload, index, list, delete work |
| AI backend | User gets grounded answer with citations |
| Backend polish | Validation, status codes, logs, rate limits work |

## Coding Standards

- Express route files stay thin.
- Services own business logic.
- Repositories are used only for repeated or complex Prisma queries.
- All inputs are validated.
- All protected operations derive user ID from JWT.
- Raw SQL must be parameterized.
- File paths must be normalized.
- Secrets never appear in logs or source code.
- Errors returned to clients must be useful but not expose internals.

## Future Backend Improvements

Version 1.5:

- API tests for auth/chat/upload/message.
- token usage tracking.
- streaming response endpoint.
- Docker for repeatable local setup.

Version 2:

- Redis-backed rate limiting.
- background document processing queue.
- cloud object storage.
- OCR processing.
- hybrid search.
- monitoring.

Version 3:

- role-based access control.
- multi-user workspaces.
- organization billing-ready backend.
- multi-agent orchestration.

## Final Quality Checklist

- Backend uses REST APIs and correct HTTP status codes.
- Middleware responsibilities are clear.
- Validation, auth, authorization, and error handling are covered.
- Cloudinary raw files are stored through the backend storage service.
- PostgreSQL, Prisma, and pgvector remain the only database stack.
- No microservice, queue, or Redis complexity is added to Version 1.
