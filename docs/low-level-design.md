# rag99 Low-Level Design

## Folder Structure

```text
rag99/
  web/
    app/
      login/page.tsx
      register/page.tsx
      chats/page.tsx
      chats/[chatId]/page.tsx
      layout.tsx
      page.tsx
    components/
      ui/
    lib/
      api.ts
      types.ts
  api/
    src/
    ai/
      ai-client.ts
      prompt-builder.ts
      retrieval.ts
    db/
      prisma.ts
    documents/
      chunk-text.ts
      extract-text.ts
      file-storage.ts
    http/
      errors.ts
      response.ts
      validation.ts
    middleware/
      auth.ts
      rate-limit.ts
      error.ts
    routes/
      auth.routes.ts
      chat.routes.ts
      document.routes.ts
    services/
      auth.service.ts
      chat.service.ts
      document.service.ts
      message.service.ts
    prisma/
      schema.prisma
      migrations/
  docs/
    product-requirements-document.md
    high-level-design.md
    low-level-design.md
  package.json
  README.md
```

Reason: `web/` owns the UI and `api/` owns REST behavior. This is still simple for Version 1, but much easier to explain and navigate than mixing frontend pages and backend routes in one tree.

## Project Structure

### Frontend App Layer

Purpose:

- Owns Next.js pages, React components, and client-side API calls.
- Keeps UI code inside the `web/` workspace.

### Backend API Layer

Purpose:

- Owns Express routes, middleware, services, and API error handling.
- Keeps backend behavior inside the `api/` workspace.

### Component Layer

Purpose:

- Reusable React UI components.
- Keeps page files small.

### Service Layer

Purpose:

- Contains business logic for auth, chats, documents, and messages.
- Prevents Express route files from becoming large.

### AI Layer

Purpose:

- Isolates embeddings, retrieval, prompt construction, and LLM calls.
- Allows provider changes without touching API routes.

### Database Layer

Purpose:

- Owns Prisma client setup.
- Prisma schema remains the source of truth for relational models.

### Document Layer

Purpose:

- Handles file saving, parsing, chunking, and cleanup.
- Keeps storage replaceable later.

## Database Schema

Core tables:

- `User`
- `Chat`
- `Message`
- `Document`
- `DocumentChunk`

Each table exists because the product needs persistent ownership, conversations, uploaded files, extracted text, and embeddings.

## ER Diagram

```text
User
  id PK
  email UNIQUE
  name
  passwordHash
  createdAt
  updatedAt
    |
    | 1-to-many
    v
Chat
  id PK
  userId FK -> User.id
  title
  createdAt
  updatedAt
    |
    | 1-to-many
    +--------------------+
    |                    |
    v                    v
Message              Document
  id PK                id PK
  chatId FK            chatId FK -> Chat.id
  role                 originalName
  content              storedName
  citations JSON       filePath
  createdAt            mimeType
                       sizeBytes
                       status
                       errorMessage
                       createdAt
                         |
                         | 1-to-many
                         v
                    DocumentChunk
                      id PK
                      documentId FK -> Document.id
                      chatId FK -> Chat.id
                      content
                      chunkIndex
                      pageNumber
                      embedding vector
                      createdAt
```

`DocumentChunk.chatId` duplicates the chat relationship intentionally. It makes chat-scoped vector search simpler and safer because retrieval can filter directly by `chatId`.

## Prisma Models

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
  title     String
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

  @@index([chatId, createdAt])
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
  id         String   @id @default(uuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  chatId     String
  content    String
  chunkIndex Int
  pageNumber Int?
  embedding  Unsupported("vector(1536)")
  createdAt  DateTime @default(now())

  @@index([documentId])
  @@index([chatId])
}

enum DocumentStatus {
  PROCESSING
  READY
  FAILED
}
```

Prisma does not fully abstract pgvector operations, so vector similarity search should use `prisma.$queryRaw` with parameterized SQL.

## Relationships

| Relationship | Type | Purpose |
|---|---|---|
| User -> Chat | One-to-many | One user owns many conversations |
| Chat -> Message | One-to-many | Chat history belongs to a chat |
| Chat -> Document | One-to-many | Each chat has its own knowledge base |
| Document -> DocumentChunk | One-to-many | Files are split into searchable chunks |

Deletes cascade from user to chats, chats to documents/messages, and documents to chunks. Cloudinary asset deletion must be handled in service code because the database cannot delete external files.

## API Design

### POST `/api/auth/register`

Purpose: create a user account.

Authentication required: no.

Request:

```json
{
  "name": "Laksh",
  "email": "laksh@example.com",
  "password": "StrongPass123"
}
```

Validation:

- `name`: string, 2-80 chars.
- `email`: valid email.
- `password`: minimum 8 chars.

Response `201`:

```json
{
  "user": { "id": "uuid", "name": "Laksh", "email": "laksh@example.com" },
  "token": "jwt"
}
```

Status codes:

- `201 Created`
- `400 Bad Request`
- `409 Conflict`
- `429 Too Many Requests`
- `500 Internal Server Error`

Possible errors:

- Invalid input.
- Email already exists.
- Rate limit exceeded.

### POST `/api/auth/login`

Purpose: authenticate user.

Authentication required: no.

Request:

```json
{
  "email": "laksh@example.com",
  "password": "StrongPass123"
}
```

Validation:

- `email`: valid email.
- `password`: non-empty string.

Response `200`:

```json
{
  "user": { "id": "uuid", "name": "Laksh", "email": "laksh@example.com" },
  "token": "jwt"
}
```

Status codes:

- `200 OK`
- `400 Bad Request`
- `401 Unauthorized`
- `429 Too Many Requests`
- `500 Internal Server Error`

### GET `/api/chats`

Purpose: list chats for current user.

Authentication required: yes.

Query parameters:

- `limit`: optional number, default 20.
- `cursor`: optional string for pagination.

Response `200`:

```json
{
  "chats": [
    {
      "id": "uuid",
      "title": "Operating Systems Notes",
      "updatedAt": "2026-08-03T10:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

Status codes:

- `200 OK`
- `400 Bad Request`
- `401 Unauthorized`

### POST `/api/chats`

Purpose: create a chat.

Authentication required: yes.

Request:

```json
{
  "title": "New Chat"
}
```

Validation:

- `title`: optional string, 1-100 chars.

Response `201`:

```json
{
  "chat": {
    "id": "uuid",
    "title": "New Chat",
    "createdAt": "2026-08-03T10:00:00.000Z"
  }
}
```

Status codes:

- `201 Created`
- `400 Bad Request`
- `401 Unauthorized`

### GET `/api/chats/:chatId`

Purpose: fetch one chat with messages and documents.

Authentication required: yes.

Route params:

- `chatId`: UUID.

Response `200`:

```json
{
  "chat": {
    "id": "uuid",
    "title": "Operating Systems Notes",
    "messages": [],
    "documents": []
  }
}
```

Status codes:

- `200 OK`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`

### PATCH `/api/chats/:chatId`

Purpose: rename chat.

Authentication required: yes.

Request:

```json
{
  "title": "Database Revision"
}
```

Validation:

- `chatId`: UUID.
- `title`: string, 1-100 chars.

Response `200`:

```json
{
  "chat": {
    "id": "uuid",
    "title": "Database Revision"
  }
}
```

Status codes:

- `200 OK`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`

### DELETE `/api/chats/:chatId`

Purpose: delete chat, messages, documents, chunks, and Cloudinary raw assets.

Authentication required: yes.

Response `204`: no body.

Status codes:

- `204 No Content`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`

Possible errors:

- Chat not found.
- User does not own chat.
- File cleanup partially fails. Log it, but database deletion should remain consistent.

### GET `/api/chats/:chatId/messages`

Purpose: list messages in a chat.

Authentication required: yes.

Response `200`:

```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "What is paging?",
      "createdAt": "2026-08-03T10:00:00.000Z"
    }
  ]
}
```

Status codes:

- `200 OK`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`

### POST `/api/chats/:chatId/messages`

Purpose: send user question and receive AI response.

Authentication required: yes.

Request:

```json
{
  "content": "Explain paging with an example."
}
```

Validation:

- `chatId`: UUID.
- `content`: string, 1-4000 chars.

Response `201`:

```json
{
  "userMessage": {
    "id": "uuid",
    "role": "user",
    "content": "Explain paging with an example."
  },
  "assistantMessage": {
    "id": "uuid",
    "role": "assistant",
    "content": "Paging is...",
    "citations": [
      {
        "documentId": "uuid",
        "documentName": "os-notes.pdf",
        "pageNumber": 4,
        "chunkIndex": 8
      }
    ]
  }
}
```

Status codes:

- `201 Created`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `409 Conflict` if no ready documents exist.
- `429 Too Many Requests`
- `502 Bad Gateway` if AI provider fails.

### GET `/api/chats/:chatId/documents`

Purpose: list uploaded documents for a chat.

Authentication required: yes.

Response `200`:

```json
{
  "documents": [
    {
      "id": "uuid",
      "originalName": "os-notes.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 1048576,
      "status": "READY",
      "createdAt": "2026-08-03T10:00:00.000Z"
    }
  ]
}
```

Status codes:

- `200 OK`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`

### POST `/api/chats/:chatId/documents`

Purpose: upload and index documents.

Authentication required: yes.

Request:

- `multipart/form-data`
- field: `files`

Validation:

- `chatId`: UUID.
- max 6 documents per chat.
- max 10 MB per file.
- allowed extensions: `.pdf`, `.txt`, `.md`, optionally `.docx`.
- allowed MIME types matching supported extensions.

Response `201`:

```json
{
  "documents": [
    {
      "id": "uuid",
      "originalName": "os-notes.pdf",
      "status": "READY",
      "chunkCount": 32
    }
  ]
}
```

Status codes:

- `201 Created`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `413 Payload Too Large`
- `415 Unsupported Media Type`
- `422 Unprocessable Entity` if text extraction fails.

### DELETE `/api/documents/:documentId`

Purpose: delete one document and its chunks.

Authentication required: yes.

Validation:

- `documentId`: UUID.

Response `204`: no body.

Status codes:

- `204 No Content`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`

## Authentication Flow

1. User submits credentials.
2. Zod validates input.
3. Register flow hashes password using bcrypt.
4. Login flow compares password using bcrypt.
5. JWT is signed with `userId`, `email`, and expiration.
6. Frontend stores token.
7. API client sends token in `Authorization` header.
8. Backend verifies token for protected routes.

## JWT Flow

JWT payload:

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "iat": 1785751200,
  "exp": 1785837600
}
```

Recommendation:

- Expiry: 24 hours for Version 1.
- Secret: `JWT_SECRET` from environment variables.

Alternative:

- Refresh tokens.

Decision:

- Skip refresh tokens in Version 1. Add them when longer sessions and server-side revocation matter.

## Password Hashing Flow

1. Validate password.
2. Generate bcrypt hash.
3. Store only `passwordHash`.
4. On login, compare submitted password with stored hash.

Recommendation:

- bcrypt cost factor: 10 or 12.

Reason:

- Strong enough for a small app while keeping login responsive.

## Middleware Flow

```text
request
  -> request logging
  -> rate limit for selected endpoints
  -> auth middleware for protected routes
  -> route param/query/body validation
  -> route handler
  -> service
  -> response helper
  -> global error handler
```

Middleware purposes:

- Logging: debugging and viva traceability.
- Rate limiting: basic abuse protection.
- Auth: confirms user identity.
- Authorization: confirms resource ownership.
- Validation: blocks malformed data early.
- Error handler: consistent responses.

## Validation Flow

Use Zod schemas for:

- body
- route params
- query params

Example:

```ts
const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});
```

Validation error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "content": ["Content is required"]
    }
  }
}
```

## File Upload Flow

1. Receive multipart form data.
2. Verify authenticated user.
3. Verify chat belongs to user.
4. Validate file count, type, and size.
5. Generate safe Cloudinary public ID using UUID.
6. Upload original file as a Cloudinary raw asset under:

```text
rag99/{userId}/{chatId}/{documentId}-{safeFileName}
```

7. Create `Document` row with `PROCESSING`.
8. Extract text.
9. Chunk text.
10. Generate embeddings.
11. Insert `DocumentChunk` rows.
12. Mark document `READY`.
13. If processing fails, mark document `FAILED` and store error message.

Storage safety rules:

- Keep Cloudinary credentials only on the backend.
- Store Cloudinary public ID and secure URL in the `Document` row.
- Normalize original filenames.
- Store UUID-based filenames.
- Prevent `../` path traversal.
- Delete Cloudinary raw asset when document is deleted.

## Document Parsing Flow

Parsers:

- `.txt`: read as UTF-8 text.
- `.md`: read as UTF-8 text.
- `.pdf`: use a PDF text extraction package.
- `.docx`: optional, use a DOCX text extraction package if time allows.

If extracted text is empty:

- Mark document as `FAILED`.
- Return `422 Unprocessable Entity`.
- Message: `No readable text found. Scanned PDFs need OCR, which is planned for a later version.`

## Embedding Generation Flow

1. Receive chunk text.
2. Call OpenAI-compatible embedding endpoint.
3. Receive vector array.
4. Store vector in `DocumentChunk.embedding`.

Rules:

- Embedding model name must be configured in env.
- Embedding dimension in pgvector must match the selected model.
- Batch embeddings if the provider supports it.

## Vector Retrieval Flow

1. Generate embedding for user question.
2. Query `DocumentChunk` by `chatId`.
3. Sort by vector distance.
4. Return top 5 chunks.
5. Apply similarity threshold.
6. If no chunk passes threshold, return uncertainty response.

Example SQL shape:

```sql
SELECT
  dc.id,
  dc.content,
  dc.chunk_index,
  dc.page_number,
  d.id AS document_id,
  d.original_name,
  dc.embedding <=> $1::vector AS distance
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE dc.chat_id = $2
ORDER BY dc.embedding <=> $1::vector
LIMIT 5;
```

The actual Prisma implementation should use parameterized `$queryRaw`.

## Prompt Construction Flow

Prompt contains:

- system instruction
- answer rules
- citation rules
- retrieved chunks
- user question

Core instruction:

```text
You are rag99, a document knowledge assistant.
Answer only using the provided retrieved context.
If the context does not contain enough evidence, say that the uploaded documents do not provide enough information.
Return structured JSON with answer, citations, and confidence.
```

## Conversation Storage Flow

1. Store user message before AI call.
2. Run retrieval and generation.
3. Store assistant message after AI call.
4. Store citations in `Message.citations` JSON.

If AI call fails:

- Keep the user message.
- Return error to frontend.
- Frontend can allow retry.

Reason: the user did send the message, even if generation failed.

## Logging Strategy

Log:

- method
- path
- status code
- duration
- userId if authenticated
- error code

Do not log:

- passwords
- JWT tokens
- API keys
- full uploaded document contents
- full AI prompts in production

Version 1 can use `console.info` and `console.error`. Add structured logging later if needed.

## Error Handling Strategy

Use a shared `AppError` shape:

```ts
type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "AI_PROVIDER_ERROR"
  | "INTERNAL_ERROR";
```

Error response:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Chat not found"
  }
}
```

Reason:

- Frontend can display consistent errors.
- Viva explanation of HTTP status codes is straightforward.

## Configuration

Configuration should be read from environment variables once and validated at startup.

Required:

- `DATABASE_URL`
- `JWT_SECRET`
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_CHAT_MODEL`
- `AI_EMBEDDING_MODEL`
- `MAX_UPLOAD_MB`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Optional:

- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `EMBEDDING_DIMENSION`

## Environment Variables

`.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/rag99"
JWT_SECRET="replace-with-a-long-random-secret"
AI_BASE_URL="https://api.example.com/v1"
AI_API_KEY="replace-with-provider-key"
AI_CHAT_MODEL="provider-chat-model"
AI_EMBEDDING_MODEL="provider-embedding-model"
EMBEDDING_DIMENSION="1536"
MAX_UPLOAD_MB="10"
CLOUDINARY_CLOUD_NAME="replace-with-cloud-name"
CLOUDINARY_API_KEY="replace-with-cloudinary-api-key"
CLOUDINARY_API_SECRET="replace-with-cloudinary-api-secret"
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX_REQUESTS="60"
```

Secrets must not be committed.

## Testing Strategy

Version 1 should include the smallest tests that catch real breakage.

Must test:

- password hashing and comparison
- JWT signing and verification
- Zod validation schemas
- chunking function
- prompt builder behavior for empty evidence

Could test:

- auth API
- chat ownership checks
- document upload validation
- vector retrieval query with seeded data

Recommendation:

- Use lightweight unit tests for pure functions first.
- Add API tests only after core flows are stable.

## Naming Conventions

- Files: kebab-case, e.g. `prompt-builder.ts`.
- React components: PascalCase, e.g. `ChatSidebar.tsx`.
- Functions: camelCase, e.g. `createChat`.
- Constants: UPPER_SNAKE_CASE for true constants.
- API routes: REST nouns, e.g. `/api/chats/:chatId/documents`.
- Database models: singular PascalCase in Prisma.
- Database columns: Prisma camelCase, mapped to SQL snake_case only if needed.

## Coding Standards

- Use TypeScript for all app code.
- Keep Express route files thin.
- Put business logic in services.
- Validate every external request with Zod.
- Use parameterized queries for raw SQL.
- Never trust client-provided `userId`; derive it from JWT.
- Never expose stack traces to the client.
- Keep AI provider code behind a small client wrapper.
- Keep file storage behind a storage service.
- Prefer simple functions over classes unless state is required.

## Final Quality Checklist

- The folder structure supports Version 1 without extra scaffolding.
- Every table maps to a real product concept.
- Every endpoint has a purpose, validation, status codes, and errors.
- Cloudinary credentials are server-side only.
- Document access remains protected by application authorization.
- Retrieval is scoped by chat ownership.
- pgvector is used without adding a separate vector database.
- The design is realistic for one developer and explainable in viva.
