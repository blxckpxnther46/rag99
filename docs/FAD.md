# Frontend Architecture & Development (FAD)

This document outlines the frontend architecture of rag99, built using Next.js 15 App Router, React 19, and Tailwind CSS 3.

## 1. Architecture Overview

A React 19 SPA powered by Next.js 15 App Router, using Tailwind CSS and shadcn/ui for styling.

## 2. Folder Structure

```
web/
├── app/
│   ├── chats/
│   │   ├── [chatId]/
│   │   │   └── page.tsx
│   │   ├── context.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ContextCards.tsx
│   ├── LiquidGlass.tsx
│   ├── LoadingState.tsx
│   ├── Logo.tsx
│   ├── StreamingText.tsx
│   └── ThinkingState.tsx
└── lib/
    ├── api.ts
    └── types.ts
```

## 3. Routing

Utilizes Next.js App Router.
-   `/`: Redirects to `/chats`.
-   `/login`: Email/password and Google One Tap login.
-   `/register`: Account creation.
-   `/chats`: Welcome screen and chat history.
-   `/chats/[chatId]`: Active chat interface.

## 4. Layout Composition

-   `RootLayout` (`web/app/layout.tsx`): Houses Google Identity Services script.
-   `ChatsLayout` (`web/app/chats/layout.tsx`): Provides the sidebar UI and wraps children in `ChatContext.Provider`.

## 5. Authentication Pages

`web/app/login/page.tsx` and `web/app/register/page.tsx` manage user input with multiple `useState` hooks. They integrate Google One Tap using the `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

## 6. Chat Interface

`web/app/chats/[chatId]/page.tsx` manages a complex UI containing:
-   Message history.
-   Markdown rendering via `react-markdown`.
-   RAG loading visualizations (`ThinkingState`, `LoadingState`).
-   Citation display (`ContextCards`).

## 7. State Management

-   **Global/Context:** `ChatContext` (`web/app/chats/context.tsx`) provides chats lists and functions.
-   **Local:** Heavy reliance on `useState` across components (e.g., 14 instances in `[chatId]/page.tsx`).
-   **Persistence:** Authentication token is stored in `localStorage`.

## 8. API Client

`web/lib/api.ts` provides the `api<T>()` fetch wrapper. It automatically injects the JWT Bearer token, redirects to `/login` on 401 Unauthorized, and dynamically detects `FormData` for multipart requests.

## 9. React Hooks Usage

Extensive use of:
-   `useState`
-   `useEffect` (timers, polling intervals, data fetching)
-   `useRef` (scroll anchoring)
-   `useRouter` (navigation)
-   `useParams` (route params)
-   `useContext` (`useChatContext`)
-   `useLayoutEffect`

## 10. Component Library

Custom components in `web/components/`:
-   `Logo`: SVG logo.
-   `LiquidGlass`: Themed UI wrapper.
-   `LoadingState`: Drive/Dots/Orbit variants via `useElapsed` hook.
-   `StreamingText`: Typewriter effect component.
-   `ThinkingState`: RAG step trace visualization.
-   `ContextCards`: Displays evidence chunks.

## 11. Async Data Fetching

Data fetching logic relies on `api()` calls. Components manage their own `isLoading` and `error` states. Optimistic updates are applied where applicable.

## 12. Document Upload & Polling

Document uploads utilize `FormData` via POST `/chats/:id/documents`.
The frontend continuously polls the document status every 3 seconds while in `PROCESSING` state using `useEffect`.

## 13. Loading/Error/Empty States

Managed locally within components, displaying user-friendly messages for empty states or errors from API operations.

## 14. Responsive Design

-   Mobile sidebar drawer.
-   Body overflow lock when modal/drawers are open.
-   Tailwind CSS utility classes used for breakpoints.

## 15. Trade-offs

-   Client-side polling instead of WebSockets/SSE for document processing status.
-   Extensive `useState` usage instead of a global state manager (Redux/Zustand), optimizing for Next.js Context simplicity.
