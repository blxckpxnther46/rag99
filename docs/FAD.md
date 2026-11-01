# Frontend Architecture & Development (FAD)

This document outlines the frontend architecture of rag99, built using Next.js 15 App Router, React 19, Tailwind CSS 3, and shadcn/ui.

## 1. Architecture Overview
A React 19 Single Page Application rendered via Next.js 15 App Router. The client interacts with the Express.js backend through authenticated REST APIs, rendering real-time RAG thinking states, retrieved document context cards, inline citations, and message feedback rating controls.

## 2. Folder Structure

```
web/
├── app/
│   ├── chats/
│   │   ├── [chatId]/
│   │   │   └── page.tsx         # Active conversation view with RAG visualizer & ratings
│   │   ├── context.tsx          # ChatContext state provider
│   │   ├── layout.tsx           # Sidebar navigation & layout shell
│   │   └── page.tsx             # Welcome screen with suggested prompts
│   ├── login/
│   │   └── page.tsx             # Email/password & Google OAuth login
│   ├── register/
│   │   └── page.tsx             # Registration & Google OAuth signup
│   ├── layout.tsx               # Root HTML layout with Google Identity Services
│   └── page.tsx                 # Root redirect to /chats
├── components/
│   ├── ContextCards.tsx         # Retrieved vector chunk evidence cards
│   ├── LiquidGlass.tsx          # Glassmorphic visual primitives
│   ├── LoadingState.tsx         # Pixel-grid animated loader
│   ├── Logo.tsx                 # Brand SVG logo
│   ├── StreamingText.tsx        # Typewriter text reveal with citation preprocessing
│   ├── ThinkingState.tsx        # Multi-step RAG progress visualizer
│   └── ui/
│       ├── button.tsx
│       └── input.tsx
└── lib/
    ├── api.ts                   # Fetch wrapper with Bearer token injection & 401 redirect
    └── types.ts                 # TypeScript interfaces for Chat, Message, Document, Citations
```

## 3. Key Components & Interactions

### 3.1 Active Chat View (`web/app/chats/[chatId]/page.tsx`)
- **Document Management:** Upload panel allowing PDF, DOCX, TXT, and MD uploads with asynchronous status polling (`PROCESSING` -> `READY`).
- **ThinkingState (`ThinkingState.tsx`):** Displays animated multi-stage progression during vector search and AI completion:
  1. Parsing user query
  2. Generating query embeddings
  3. Querying pgvector document database
  4. Synthesizing grounded response
- **ContextCards (`ContextCards.tsx`):** Expandable evidence viewer detailing source file names, chunk indices, and retrieved content snippets.
- **Message Feedback / Rating (`handleRating`):**
  - Displays Thumbs Up and Thumbs Down buttons under assistant messages.
  - Clicking sends a `PATCH /api/chats/:chatId/messages/:messageId/rating` request to the backend.
  - State updates optimistically and synchronizes with the MongoDB telemetry database.

### 3.2 Authentication (`login/page.tsx` & `register/page.tsx`)
- Standard credential inputs (email, password).
- Google OAuth 2.0 via Google One Tap and button callback, exchanging the ID token for a JWT session token.

### 3.3 API Client (`web/lib/api.ts`)
- Configured using `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000` in dev).
- Automatically includes `Authorization: Bearer <token>` from `localStorage`.
- Intercepts 401 Unauthorized responses to clear stale sessions and redirect to `/login`.

## 4. Deployment Configuration (Vercel)
- **Framework Preset:** Next.js
- **Root Directory:** `web`
- **Build Command:** `next build`
- **Output Directory:** `.next`
- **Environment Variables:**
  - `NEXT_PUBLIC_API_URL`: URL of the deployed Render backend (e.g. `https://rag99-api.onrender.com`).
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth Web Client ID.


## 5. Core Frontend JavaScript & Rendering Concepts

### 5.1 JavaScript — Event Loop & Closures
Implemented in `web/components/ThinkingState.tsx`:
- `useSequence` hook leverages the JavaScript event loop macrotask queue via `setTimeout`.
- Timers execute asynchronously after the synchronous call stack and microtask queues resolve.
- Forms closures over state variables (`stage`), referencing the latest stage progression across re-renders.

### 5.2 JavaScript — Hoisting
Implemented in `web/components/ThinkingState.tsx`:
- Function declarations (e.g. `useSequence`) are hoisted with their definitions to the top of module scope during JavaScript compilation phase, enabling invocation throughout the component lifecycle.

### 5.3 Server-Side Rendering (SSR)
Implemented in `web/app/layout.tsx` and `web/app/page.tsx`:
- Next.js React Server Components (RSC) execute server-side on every request to generate and stream the initial HTML shell.

### 5.4 Containerization with Docker
- `web/Dockerfile`: Multi-stage Next.js production build container.