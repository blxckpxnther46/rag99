# rag99 Handoff Status

This file is written as a handoff for another AI/coding agent. Read this before making changes.

## User Goal

Build `rag99`, a college viva AI web app:

- Next.js frontend in `web/`
- Express.js backend in `api/`
- PostgreSQL + Prisma + pgvector
- JWT + bcrypt auth
- Zod validation
- Cloudinary raw file storage
- RAG pipeline using OpenAI-compatible LLM + embedding APIs

The user explicitly wanted a clear `web/` + `api/` monorepo, not a confusing single-app structure.

The user also explicitly said: **do not test/build right now**.

## Current Repository Shape

```txt
rag99/
  api/
    prisma/
      schema.prisma
      migrations/000001_init/migration.sql
    src/
      ai/
      db/
      documents/
      http/
      middleware/
      routes/
      services/
      app.ts
      config.ts
      schemas.ts
      self-check.ts
      server.ts
    .env.example
    package.json
    tsconfig.json
  web/
    app/
      chats/
      login/
      register/
      globals.css
      layout.tsx
      page.tsx
    components/ui/
    lib/
    .env.example
    package.json
    tsconfig.json
    next.config.ts
    tailwind.config.ts
    postcss.config.js
  docs/
    product-requirements-document.md
    high-level-design.md
    low-level-design.md
    frontend-architecture-development-plan.md
    backend-architecture-development-plan.md
    ai-architecture-development-plan.md
  README.md
  package.json
  .gitignore
  status.md
```

There is no intended local `uploads/` storage anymore. Cloudinary is the Version 1 storage provider.

## Important Architecture Decisions

### Backend

Use Express.js in `api/`.

Reason:

- clearer backend ownership for viva
- easy REST/middleware/status-code explanation
- avoids mixing API files into Next.js frontend folders

### Frontend

Use Next.js in `web/`.

Reason:

- simple routing
- React + TypeScript
- easy deployment to Vercel later

### Storage

Use Cloudinary raw uploads.

Reason:

- gives the project a real cloud integration
- improves viva scoring
- avoids local/serverless file durability problems

Current storage behavior:

- uploaded file buffer is sent to Cloudinary as `resource_type: "raw"`
- Cloudinary public ID shape:

```txt
rag99/<userId>/<chatId>/<generated-id>-<safe-original-name>
```

- PostgreSQL `Document.storedName` stores Cloudinary `public_id`
- PostgreSQL `Document.filePath` stores Cloudinary `secure_url`
- text extraction uses the uploaded memory buffer directly, not a local file path
- document delete destroys the Cloudinary raw asset using `storedName`

### Database

Use PostgreSQL + Prisma + pgvector.

Tables:

- `User`
- `Chat`
- `Message`
- `Document`
- `DocumentChunk`

Prisma uses camelCase column names. Important: raw SQL must use quoted camelCase names, e.g. `"documentId"`, `"chatId"`, `"chunkIndex"`.

## Code Implemented

### API Implemented

Backend files exist under `api/src/`.

Implemented:

- Express app setup
- CORS
- JSON parsing
- rate limiting
- global error handler
- auth middleware
- register/login routes
- chat routes
- document routes
- message/RAG route
- Zod body validation
- Zod route param validation
- Prisma client
- Cloudinary storage service
- text extraction for PDF/DOCX/TXT/MD
- chunking
- embedding call
- pgvector retrieval
- prompt builder
- structured JSON answer parsing

Important API endpoints:

```txt
POST   /api/auth/register
POST   /api/auth/login
GET    /api/chats
POST   /api/chats
GET    /api/chats/:chatId
PATCH  /api/chats/:chatId
DELETE /api/chats/:chatId
GET    /api/chats/:chatId/messages
POST   /api/chats/:chatId/messages
GET    /api/documents/chats/:chatId/documents
POST   /api/documents/chats/:chatId/documents
DELETE /api/documents/:documentId
```

### Frontend Implemented

Frontend files exist under `web/`.

Implemented:

- login page
- register page
- chat list page
- chat detail page
- simple UI components
- API client
- token storage in `localStorage`
- create chat
- upload document
- delete document
- send prompt
- markdown rendering
- loading/error states

Missing frontend polish:

- rename chat UI
- delete chat UI
- citation display below assistant messages
- better document empty state
- better unsupported file type message

## Environment Variables

`api/.env.example` currently expects:

```txt
DATABASE_URL=
JWT_SECRET=
AI_BASE_URL=
AI_API_KEY=
AI_CHAT_MODEL=
AI_EMBEDDING_MODEL=
EMBEDDING_DIMENSION=1536
MAX_UPLOAD_MB=10
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
PORT=4000
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

`web/.env.example` expects:

```txt
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Docs State

The six docs in `docs/` exist and have been updated away from the old single Next.js API architecture.

Recent doc changes:

- changed backend from Next.js Route Handlers to Express.js
- changed storage from local files to Cloudinary raw storage
- removed old `uploads/` and `UPLOAD_DIR` references from main docs/status/README scans

Known caveat:

- I did not deeply re-review every sentence after the Cloudinary switch. A quick scan removed obvious stale local-storage references. Another agent should do one more documentation consistency pass before final submission.

## Known Risks / Likely Fixes Needed

No tests/builds were run after the Cloudinary change because user asked not to.

Likely things to verify later:

1. Install dependencies so `cloudinary` is present.
2. Run TypeScript build for `api`.
3. Run TypeScript build for `web`.
4. Ensure Prisma client generation works with `Unsupported("vector(1536)")`.
5. Ensure Cloudinary raw upload typings compile.
6. Ensure `pdf-parse` import works under ESM/TypeScript.
7. Ensure the migration column names match raw SQL.
8. Decide whether Cloudinary raw assets need signed/private delivery for final demo. Current code stores `secure_url`; access control is app-level, not Cloudinary-level.

## Commands To Run Later

Do not run these until user allows testing/building.

Install:

```bash
npm install
```

Create env files:

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env.local
```

Run migration:

```bash
npm run prisma:migrate --workspace api
```

Checks:

```bash
npm run self-check
npm run build --workspace api
npm run build --workspace web
```

Dev servers:

```bash
npm run dev:api
npm run dev:web
```

Expected URLs:

```txt
API: http://localhost:4000
Web: http://localhost:3000
```

## Manual Demo Flow

Use this after setup:

1. Register user.
2. Login.
3. Create chat.
4. Upload `.pdf`, `.txt`, `.md`, or `.docx`.
5. Confirm Cloudinary asset appears.
6. Confirm document becomes `READY`.
7. Ask a document-grounded question.
8. Confirm answer is based on retrieved chunks.
9. Delete document.
10. Confirm DB document removed and Cloudinary asset destroyed.
11. Create another chat and confirm documents are chat-isolated.

## What To Do Next

Recommended next agent order:

1. Do a quick code review for Cloudinary integration.
2. Do one final docs consistency scan for old local-storage wording.
3. When user allows it, run `npm install`.
4. Fix any TypeScript/build errors.
5. Add missing UI controls if time remains:
   - rename chat
   - delete chat
   - citation rendering
6. Then run full manual demo.

## Do Not Do

- Do not revert to a single Next.js full-stack app.
- Do not reintroduce local `uploads/` as the primary storage.
- Do not add Docker, Redis, workers, queues, microservices, or Kubernetes for Version 1.
- Do not run tests/builds unless the user allows it.
- Do not commit real secrets.

## Summary

rag99 is mid-implementation but structurally coherent now:

- `web/` is the Next.js frontend.
- `api/` is the Express backend.
- Cloudinary stores original uploaded files.
- PostgreSQL + pgvector stores metadata, messages, chunks, and embeddings.
- The main unfinished work is dependency installation, build fixes, final docs consistency, and end-to-end demo validation.
