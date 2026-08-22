# rag99 Frontend Architecture & Development Plan

## Frontend Architecture

rag99 uses **Next.js App Router**, **React**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**.

The frontend has three jobs:

- authenticate users,
- let users manage chats and documents,
- provide a ChatGPT-like interface for asking document-grounded questions.

Alternatives considered:

- Vite React: faster minimal setup, but needs more routing and deployment glue.
- Next.js: includes routing, pages, and deployment conventions in one frontend project.
- Angular: strong structure, but too heavy for a one-developer Version 1.

Recommendation:

- Use Next.js because rag99 benefits from clean routing, React defaults, and a simple `web/` deployment path.

## Folder Structure

```text
app/
  (auth)/
    login/page.tsx
    register/page.tsx
  (app)/
    chats/page.tsx
    chats/[chatId]/page.tsx
  layout.tsx
  page.tsx

components/
  auth/
    LoginForm.tsx
    RegisterForm.tsx
    ProtectedRoute.tsx
  chat/
    ChatHeader.tsx
    ChatInput.tsx
    MessageBubble.tsx
    MessageList.tsx
    SuggestedPrompts.tsx
    TypingIndicator.tsx
  documents/
    DocumentList.tsx
    DocumentUpload.tsx
    DocumentStatusBadge.tsx
  layout/
    AppShell.tsx
    Sidebar.tsx
    MobileSidebar.tsx
  ui/
    shadcn components

lib/
  api/
    client.ts
    auth.api.ts
    chats.api.ts
    documents.api.ts
    messages.api.ts
  hooks/
    useAuth.ts
    useChats.ts
    useChat.ts
  types/
    api.ts
    chat.ts
    document.ts
    message.ts
```

Reason: this is enough separation to keep pages readable without adding a state library or frontend framework inside the framework.

## Routing

| Route | Purpose | Auth |
|---|---|---|
| `/` | Redirect to `/chats` if logged in, otherwise `/login` | conditional |
| `/login` | User login | public |
| `/register` | User registration | public |
| `/chats` | Empty or latest chat view | protected |
| `/chats/[chatId]` | Main chat workspace | protected |

Client-side routing is handled by Next.js `Link`, `useRouter`, and dynamic routes.

## Navigation

Primary navigation is the sidebar:

- app name,
- create chat button,
- chat history,
- selected chat state,
- rename chat action,
- delete chat action,
- logout action.

Mobile behavior:

- sidebar collapses behind a menu button,
- chat content remains the primary view,
- document panel can stack above or below chat depending on width.

## Application Layout

```text
+------------------------------------------------+
| Sidebar        | Chat Header                    |
|                |--------------------------------|
| New Chat       | Messages                       |
| Chat List      |                                |
| Logout         | Suggested prompts / empty view |
|                |                                |
|                | Chat input                     |
+------------------------------------------------+
```

When a chat is selected, the right side shows:

- chat title,
- document upload/manage area,
- message history,
- suggested prompts if no messages exist,
- input area.

## Sidebar

Purpose:

- let users switch between chats quickly,
- expose create, rename, and delete actions,
- make rag99 feel familiar like ChatGPT/Gemini.

State:

- loading while chats load,
- empty state when no chats exist,
- selected state for active chat,
- error state if chat list fails.

## Chat Interface

The chat interface contains:

- `MessageList`
- `MessageBubble`
- `TypingIndicator`
- `SuggestedPrompts`
- `ChatInput`

Message rendering:

- user messages align right or use distinct styling,
- assistant messages align left,
- assistant content supports markdown,
- citations render below assistant answer.

Markdown safety:

- render markdown through a safe renderer,
- avoid raw HTML rendering unless sanitized.

## Upload Interface

`DocumentUpload` supports:

- drag-and-drop or file picker,
- allowed type hints,
- max size warning,
- upload progress/loading state,
- per-file success/failure display.

Accepted Version 1 files:

- `.pdf`
- `.txt`
- `.md`
- `.docx` if backend support is implemented.

Important UI copy:

- If a scanned PDF has no readable text, show that OCR is not supported in Version 1.

## Suggested Prompts

Suggested prompts appear after documents are uploaded and before the first user message.

Examples:

- "Summarize the uploaded documents."
- "What are the key definitions?"
- "Create viva questions from these documents."
- "Explain the most important topic with citations."

Purpose:

- improves first-use experience,
- demonstrates prompt UX,
- helps viva evaluators test quickly.

## Chat History

Chat history is fetched from:

- `GET /api/chats`
- `GET /api/chats/:chatId`

Frontend should show:

- chat title,
- latest updated time if useful,
- active chat highlight.

After rename/delete/create:

- update local state immediately after successful API response.

No global cache library is required in Version 1. `useState` and `useEffect` are enough.

## Authentication Pages

### Register

Fields:

- name,
- email,
- password.

States:

- submitting,
- validation errors,
- duplicate email error,
- success redirect.

### Login

Fields:

- email,
- password.

States:

- submitting,
- invalid credentials,
- rate limit error,
- success redirect.

Token storage:

- Store JWT in memory plus `localStorage` for Version 1 simplicity.

Trade-off:

- HttpOnly cookies are safer against XSS but require more server-side handling.
- `localStorage` is simpler for a college Version 1, but the UI must avoid unsafe script injection and raw HTML rendering.

Production improvement:

- Move JWT to HttpOnly secure cookies.

## Settings

Version 1 does not need a full settings page.

Minimum settings behavior:

- logout,
- optional display of current user name/email.

Skipped:

- profile editing,
- theme customization,
- API key management.

Add when:

- users need account management beyond the viva demo.

## Component Hierarchy

```text
AppShell
  Sidebar
    CreateChatButton
    ChatHistoryItem
    LogoutButton
  MainPanel
    ChatHeader
      DocumentUpload
      DocumentList
    MessageList
      MessageBubble
      CitationList
      TypingIndicator
    SuggestedPrompts
    ChatInput
```

Reason:

- keeps layout separate from chat logic,
- keeps document controls close to the active chat,
- avoids one large page component.

## State Management

Use:

- `useState` for form values, selected files, loading flags, and local UI state.
- `useEffect` for fetching chats/messages/documents when route params change.
- React context only for authentication state.

Avoid in Version 1:

- Redux,
- Zustand,
- TanStack Query unless the app already grows beyond simple fetching.

Reason:

- Required rubric includes `useState`, `useEffect`, async fetching, and component composition.
- A state library adds little value for a small app.

## API Integration Strategy

Create a small `apiClient` wrapper around `fetch`.

Responsibilities:

- attach JWT token,
- set JSON headers,
- parse JSON,
- normalize error responses,
- handle `401` by logging out or redirecting to login.

Example API modules:

- `auth.api.ts`
- `chats.api.ts`
- `documents.api.ts`
- `messages.api.ts`

This avoids repeating fetch boilerplate in components.

## Loading States

Required loading states:

- login/register submit,
- chat list fetch,
- chat detail fetch,
- document upload/indexing,
- message send,
- assistant typing.

Design:

- use skeletons for chat list and message list,
- disable buttons during submit,
- show spinner or progress row during upload,
- show typing indicator while AI response is pending.

## Empty States

Required empty states:

- no chats yet,
- chat has no documents,
- chat has documents but no messages,
- no citations available.

Empty states should be short and action-oriented.

Example:

- "Upload documents to start asking questions."

## Error States

Required error states:

- invalid login,
- duplicate email,
- failed chat fetch,
- failed upload,
- unsupported file,
- oversized file,
- document extraction failed,
- AI provider failed,
- insufficient evidence.

Frontend should display backend messages when safe and useful. Internal errors should use generic user-facing text.

## Responsive Behaviour

Desktop:

- persistent sidebar,
- main chat area,
- document controls near header.

Tablet:

- narrower sidebar,
- chat content remains central.

Mobile:

- sidebar hidden behind menu,
- document list collapsible,
- chat input fixed near bottom,
- message bubbles use full width with readable spacing.

No complex responsive framework is needed beyond Tailwind utilities.

## Accessibility

Minimum requirements:

- keyboard-focusable buttons and inputs,
- visible focus states,
- form labels,
- `aria-label` for icon-only buttons,
- sufficient text contrast,
- error messages tied to fields where practical,
- upload input usable without drag-and-drop.

Reason:

- Accessibility basics are not optional. They also improve viva quality because the UI looks professionally considered.

## Design System

Use shadcn/ui components for:

- buttons,
- inputs,
- dialogs,
- dropdown menus,
- toast messages,
- scroll areas,
- badges,
- sheets for mobile sidebar.

Use Tailwind for layout and spacing.

Recommended style:

- quiet productivity UI,
- readable chat layout,
- restrained color palette,
- no marketing hero page,
- no decorative gradients as the primary design.

Purpose:

- rag99 is a tool, not a landing page.

## Reusable Components

| Component | Purpose |
|---|---|
| `AppShell` | Shared authenticated layout |
| `Sidebar` | Chat navigation |
| `ChatInput` | User prompt input |
| `MessageBubble` | User/assistant message display |
| `CitationList` | Show source documents/chunks |
| `DocumentUpload` | Upload files |
| `DocumentList` | Manage uploaded documents |
| `LoadingState` | Shared loading UI |
| `ErrorState` | Shared error UI |
| `EmptyState` | Shared empty UI |

## Development Phases

### Phase 1: Base UI and Auth

- create Next.js app structure,
- configure Tailwind and shadcn/ui,
- load Google Identity Services library in RootLayout,
- build login/register pages with Google One Tap / Login buttons and token verifications,
- build auth context,
- protect app routes.

### Phase 2: Chat Shell

- build app layout,
- build sidebar,
- create/list/rename/delete chats,
- route to selected chat.

### Phase 3: Documents

- build upload component,
- show document list,
- implement auto-polling for documents with `PROCESSING` status,
- show processing/ready/failed status,
- delete documents.

### Phase 4: Chat

- build message list,
- build chat input,
- send message API call,
- render assistant markdown,
- show citations and typing indicator.

### Phase 5: Polish

- responsive checks,
- loading and error states,
- empty states,
- accessibility pass.


## Milestones

| Milestone | Done When |
|---|---|
| Auth UI complete | User can register, login, and enter app |
| Chat UI complete | User can manage chats from sidebar |
| Upload UI complete | User can upload and see document status |
| AI chat complete | User can ask questions and see cited answers |
| Demo-ready polish | App works on desktop/mobile with clear states |

## Coding Standards

- Use TypeScript types for all API responses.
- Keep page files small; move UI to components.
- Keep API calls out of JSX-heavy components where practical.
- Avoid global state unless shared across routes.
- Use semantic HTML for forms and buttons.
- Keep visible text short and useful.
- Do not render raw HTML from AI responses.

## Future Frontend Improvements

Version 1.5:

- streaming responses,
- better upload progress,
- keyboard shortcuts,
- better retry UX.

Version 2:

- document preview,
- search inside uploaded documents,
- richer citation panel,
- workspace settings.

Version 3:

- collaborative chat spaces,
- role-based UI,
- analytics dashboard.

## Final Quality Checklist

- Frontend uses React fundamentals naturally.
- UI supports all mandatory Version 1 features.
- State management remains simple.
- Loading, empty, and error states are explicitly planned.
- Responsive and accessibility basics are included.
- No unnecessary frontend framework or state library is added.
