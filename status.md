# rag99 Project Status & Architecture Report

This file documents the current successfully completed state, design choices, and configurations of `rag99` after deployment, debugging, and local verification.

---

## 1. Project Goal & Overview
`rag99` is a college viva AI-powered document knowledge web application built as a clean, separated workspace:
*   **Next.js Frontend** (under `web/` workspace)
*   **Express.js Backend** (under `api/` workspace)
*   **Database**: Neon PostgreSQL + Prisma + pgvector (1024-dimension embeddings)
*   **Cloud Storage**: Cloudinary (handles uploads by file type)
*   **AI Provider**: Multi-provider Round-Robin Client Pool (using Groq + OpenRouter)
*   **Auth**: Local JWT + bcrypt registration and login, alongside integrated Google OAuth sign-in.

---

## 2. Current Architecture Decisions

### A. Backend Layer (Express.js)
*   Located in `api/src/`.
*   Thin route controllers map request validation (Zod) and pass actions to service classes.
*   **Database pooling**: Configured with a `connect_timeout=30` parameter on the database connection string to survive Neon compute auto-suspend cold starts.

### B. Storage Layer (Cloudinary)
*   **MIME-type split**:
    *   PDF files are uploaded with `resource_type: "image"` so that Cloudinary serves them with correct `Content-Type: application/pdf` headers, allowing native browser rendering.
    *   Text, markdown, and DOCX files are uploaded with `resource_type: "raw"`.
*   Deletion of documents from the backend deletes the asset from Cloudinary dynamically based on file type.

### C. AI & Embedding Layer (Groq & OpenRouter client pool)
*   **Rotated Completion Pool**: Rotates chat completion generation across your configured API keys (1x Groq key + 4x OpenRouter keys) with automatic failover (if one fails, it tries the next).
*   **Rotated Embedding Pool**: Rotates embedding generation across your 4 OpenRouter keys using OpenAI's `text-embedding-3-small` model with `dimensions: 1024` to match the PostgreSQL schema.
*   **State Persistence**: The rotation indices are persisted to local files (`api/src/ai/.pool-index` and `api/src/ai/.embed-index`) so they survive application restarts, picking up at the last used key + 1.

### D. RAG Pipeline Configuration
*   **Chunk size**: 2000 characters.
*   **Chunk overlap**: 200 characters.
*   **Top-k retrieval**: Retrieves the top-4 most relevant context chunks.
*   **Dialogue context**: Limits history payload to the last 4 chat messages.
*   **Temperature**: Low (`0.2`) to reduce hallucinations.
*   **Hybrid RAG + Chatbot Fallback**: Blends document RAG retrieval with fallback general AI knowledge, citation-verified only for direct evidence matches.
*   **Strict Response Modes**: Supports "Explain" (structured breakdowns) and "Concise" (hard-capped to maximum of 3 sentences via prompt overrides to resist injection overrides).

---

## 3. Environment Variables

### Backend (`api/.env`)
```env
DATABASE_URL="postgresql://neondb_owner:...@ep-...c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&connect_timeout=30"
JWT_SECRET="replace-with-a-long-random-secret"

# Default Model Configs (Zod required fields)
AI_BASE_URL="https://openrouter.ai/api/v1"
AI_API_KEY="sk-or-v1-..."  # Your primary OpenRouter key
AI_CHAT_MODEL="meta-llama/llama-3.3-70b-instruct"
AI_EMBEDDING_MODEL="openai/text-embedding-3-small"
EMBEDDING_DIMENSION="1024"

# Cloudinary Credentials
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Key Rotation Pool
GROQ_API_KEY="gsk_..."
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_API_KEY1="sk-or-v1-..."
OPENROUTER_API_KEY2="sk-or-v1-..."
OPENROUTER_API_KEY3="sk-or-v1-..."
```

---

## 4. Completed Milestones & Verifications
*   [x] JWT / Google Auth local storage session check.
*   [x] Background text extraction & chunk parser checks.
*   [x] Vector similarity lookup through Raw Prisma SQL (cosine operator `<=>`).
*   [x] Automatic session redirection on 401 Unauthorized API responses.
*   [x] All backend/frontend TypeScript files compile cleanly.
*   [x] API self-check suite (`npm run self-check`) passes successfully.

---

## 5. UI/UX Redesign (Gemini-Inspired AI Workspace)
*   **Conversational Canvas First**: Completely replaced the old gray dashboard card view. The chat is now a spacious, full-screen conversational canvas centered around an off-black background (`bg-[#131314]`).
*   **Full-Height Left Sidebar**: Built a quiet, dark left sidebar (`bg-[#1e1f20]`) with:
    *   Subtle R9/rag99 branding at the top.
    *   Rounded "New chat" button and integrated text-search filters.
    *   Hover-triggered contextual actions (rename and delete) to preserve clean negative space.
    *   Bottom user profile details, settings feedback, and sign-out triggers.
*   **Conversational Bubbles & Plain Assistant Text**:
    *   User messages render as dark rounded bubbles (`bg-[#28282a]`) on the right.
    *   Assistant responses render as plain conversational text on the left, fully supporting markdown syntax.
    *   Subtle icon action row (Copy text, Upvote, Downvote) added below each assistant response.
*   **Integrated Document Panel (Notebook Overlay)**: Moved document management to a clean overlay modal accessible via the header's active document count. Users can upload new PDF, TXT, MD, or DOCX documents or delete existing ones in this context cleanly.
*   **Centered Floating Composer**: Input text area is a centered floating pill (650px–750px wide) at the bottom, equipped with an attachment trigger, auto-resizing text-area, and send icon.
