# rag99

rag99 is an AI-powered document knowledge assistant for a college project viva.

Users create chats, upload 5-6 documents per chat, and ask questions that are answered using retrieved document evidence. The design goal is a complete, technically correct Version 1 application that demonstrates strong software engineering fundamentals without unnecessary complexity.

Core principle:

```text
Retrieve first. Generate second. Trust evidence over confidence.
```

## Documentation

The complete product documentation is in `docs/`:

- [Product Requirements Document](docs/product-requirements-document.md)
- [High-Level Design](docs/high-level-design.md)
- [Low-Level Design](docs/low-level-design.md)
- [Frontend Architecture & Development Plan](docs/frontend-architecture-development-plan.md)
- [Backend Architecture & Development Plan](docs/backend-architecture-development-plan.md)
- [AI Architecture & Development Plan](docs/ai-architecture-development-plan.md)

## Version 1 Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Express.js REST API
- PostgreSQL
- Prisma ORM
- pgvector
- JWT
- bcrypt
- Zod
- OpenAI-compatible LLM and embedding APIs
- Cloudinary raw file storage for uploaded documents

## Version 1 Scope

- User registration and login
- Protected routes
- Chat creation, rename, delete, and history
- Per-chat document uploads
- Document parsing, chunking, embeddings, and vector search
- AI answers grounded in retrieved context
- Citations where possible
- Markdown responses
- Loading, typing, empty, and error states

Advanced features such as OCR, Redis, Docker, streaming responses, hybrid search, Graph RAG, and multi-user workspaces are intentionally deferred to later versions.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env.local
```

3. Configure PostgreSQL with pgvector and update `DATABASE_URL`.

4. Add Cloudinary credentials in `api/.env`.

5. Run Prisma migration:

```bash
npm run prisma:migrate --workspace api
```

6. Start the app:

```bash
npm run dev:api
npm run dev:web
```

The web app runs at `http://localhost:3000`; the API runs at `http://localhost:4000`.
