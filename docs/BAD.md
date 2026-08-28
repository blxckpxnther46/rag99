# Backend Architecture & Development (BAD)

This document outlines the backend architecture of rag99, implemented with Express.js and TypeScript.

## 1. Architecture Overview

The backend is an Express.js 4 application with Node.js ES modules. It uses Prisma ORM with PostgreSQL (Neon).

## 2. Folder Structure

```
api/
├── src/
│   ├── ai/
│   │   ├── ai-client.ts
│   │   ├── client-pool.ts
│   │   ├── prompt-builder.ts
│   │   └── retrieval.ts
│   ├── db/
│   │   └── prisma.ts
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

`api/src/app.ts` contains the middleware stack and Express configuration:
-   `cors`
-   JSON body parser (1MB limit)
-   `rateLimit`
-   Route definitions
-   `errorHandler`

## 4. Controllers

Route files in `api/src/routes/` act as thin controllers, delegating business logic to the services.
-   `auth.routes.ts`: `POST /register`, `POST /login`, `POST /google`
-   `chat.routes.ts`: `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `GET /:id/messages`, `POST /:id/messages`, `GET /:id/documents`, `POST /:id/documents`
-   `document.routes.ts`: `DELETE /:documentId`

## 5. Service Layer

Business logic resides in `api/src/services/`.
-   `auth.service.ts`: `register`, `login`, `loginWithGoogle`.
-   `chat.service.ts`: `listChats`, `createChat`, `ownedChat`, `getChat`, `renameChat`, `deleteChat`.
-   `document.service.ts`: `listDocuments`, `addDocument`, `removeDocument`.
-   `message.service.ts`: `listMessages`, `ask`.

## 6. Database Layer

`api/src/db/prisma.ts` exports a singleton `PrismaClient` instance. Raw SQL is used for vector similarity operations (see `api/src/ai/retrieval.ts`).

## 7. Authentication

-   **Local:** Email/password combinations.
-   **Google OAuth 2.0:** Utilizing the `tokeninfo` API to verify tokens, check `aud`, and `email_verified`.
Implemented in `api/src/services/auth.service.ts`.

## 8. JWT Implementation

-   **Library:** `jsonwebtoken`.
-   **Expiry:** 7 days.
-   **Claims:** User ID and email.
-   **Verification:** Done in `api/src/middleware/auth.ts`.

## 9. Password Hashing

-   **Library:** `bcryptjs`.
-   **Rounds:** 12 rounds.

## 10. Middleware Stack

-   **CORS:** Cross-Origin Resource Sharing.
-   **JSON Parsing:** 1MB limit.
-   **Rate Limiting:** `api/src/middleware/rate-limit.ts`.
-   **Authentication:** `api/src/middleware/auth.ts` (Requires Bearer token, attaches `req.user`).
-   **Error Handling:** `api/src/middleware/error.ts`.
-   **Multer:** Configured for file uploads.

## 11. Validation

`api/src/schemas.ts` defines Zod schemas (e.g., `authSchema`, `loginSchema`, `messageSchema`). Invalid requests are caught and formatted as 400 Bad Request errors.

## 12. Error Handling

`api/src/http/errors.ts` contains the `AppError` class.
`api/src/http/async-handler.ts` wraps async routes to propagate errors to `next`.
Status codes used: 200, 201, 204, 400, 401, 404, 409, 413, 415, 429, 500, 502.

## 13. File Upload & Storage

-   **Multer:** Filters MIME types.
-   **Cloudinary:** Streamed upload using `raw` and `image` resource types (`api/src/documents/file-storage.ts`).

## 14. Rate Limiting

Implemented in `api/src/middleware/rate-limit.ts`.
-   Uses an in-memory `Map<string, {count, reset}>`.
-   Per-IP tracking.
-   Throws `AppError(429)` on limit breach.
-   **Trade-off:** In-memory map will reset on server restart and doesn't scale across multiple Node.js instances without a centralized store (like Redis, which is *not* used).

## 15. Environment Configuration

Variables are validated using Zod at boot in `api/src/config.ts`.
Keys include: `DATABASE_URL`, `JWT_SECRET`, `AI_BASE_URL`, `AI_API_KEY`, `AI_CHAT_MODEL`, `AI_EMBEDDING_MODEL`, `EMBEDDING_DIMENSION`, `MAX_UPLOAD_MB`, `CLOUDINARY_CLOUD_NAME/KEY/SECRET`, `PORT`, `CORS_ORIGIN`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `GOOGLE_CLIENT_ID`, `GROQ_API_KEY`, `OPENROUTER_API_KEY/1/2/3`.

## 16. Trade-offs

-   In-memory rate limiting instead of Redis.
-   Direct Prisma use instead of repository pattern for simpler architecture.
-   RESTful architecture without GraphQL or gRPC, optimizing for simplicity.
