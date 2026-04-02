# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Constraint

**Do NOT run `npm run` commands.** All `npm run` commands must be executed by the user. You may suggest commands but must not run them yourself.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start DB container + Next.js dev server (Turbopack, port 5000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Reset DB and run migrations (destructive — wipes all data) |
| `npm run db:push` | Push Prisma schema to DB without migration files |
| `npm run db:studio` | Open Prisma Studio GUI |

No test runner is configured in this project.

## Architecture

RAG chatbot: documents are chunked → embedded locally → stored in pgvector. On each chat message, similar chunks are retrieved and passed as context to Gemini.

**Data flow:**
1. `POST /api/ingest/` — upload file → parse → `chunker.ts` → `embedding.ts` → pgvector
2. `POST /api/chat/` — user message → `retriever.ts` (cosine similarity) → Gemini `gemini-2.0-flash` → streamed response

**Key files:**
- `src/lib/embedding.ts` — local `Xenova/multilingual-e5-small` model (384-dim), cached in `.cache/transformers/`
- `src/lib/chunker.ts` — splits text into 500-char chunks with 100-char overlap
- `src/lib/retriever.ts` — raw SQL with pgvector `<=>` operator
- `src/app/api/chat/route.ts` — manually implements AI SDK Data Stream Protocol for `useChat` compatibility
- `src/app/api/ingest/route.ts` — handles GET/POST/DELETE for document management
- `src/app/page.tsx` — chat UI with `useChat` hook and `renderContent()` for inline image rendering
- `src/app/admin/page.tsx` — document upload/delete UI

## Non-Obvious Constraints

**Trailing slashes required everywhere** — `trailingSlash: true` in `next.config.ts`. All `fetch()` calls and `router.push()` must use URLs ending in `/` (e.g., `/api/ingest/` not `/api/ingest`).

**pdf-parse import path** — must use `pdf-parse/lib/pdf-parse.js`, not `pdf-parse`. The package entrypoint tries to read test files via `fs` which fails in Next.js. Types are hand-declared in `src/types/pdf-parse.d.ts`.

**Server-only packages** — `@xenova/transformers` and `pdf-parse` are in `serverExternalPackages` and must never be imported from client components.

**Streaming format** — `app/api/chat/route.ts` uses `@google/generative-ai` directly (not AI SDK) but manually formats output as AI SDK Data Stream Protocol so `useChat` works:
- Text chunk: `0:"text"\n`
- Done: `d:{"finishReason":"stop"}\n`
- Header: `x-vercel-ai-data-stream: v1`

**Image handling** — uploaded images are stored in `public/images/`. The ingest API stores `이미지 /images/<filename>` as the document content. The chat API is prompted to echo those paths back verbatim. `renderContent()` in `app/page.tsx` splits on the `IMAGE_PATH_REGEX` pattern and renders `<img>` tags.

**TypeScript strict mode is partially disabled** — `strictNullChecks` and `strictPropertyInitialization` are off. Do not rely on null-safety checks.

## Path Aliases

```ts
@/*    → ./src/*
@lib/* → ./src/lib/*
```

## Embedding Model

`Xenova/multilingual-e5-small` outputs 384 dimensions. If the model is changed, `vector(384)` in `prisma/schema.prisma` and the migration SQL must be updated, then `db:migrate` re-run and all documents re-uploaded.

## Planned (Not Yet Implemented)

Admin auth: JWT + httpOnly cookies via `src/app/api/cookie/` route handler, auth state in React Context (`IsLogin`, `AccessTokenContext`), redirect to `/login/` from `layout.tsx`.
