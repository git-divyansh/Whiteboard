# Whiteboard

A real-time collaborative whiteboard (Miro / FigJam-class) — freehand drawing,
shapes, sticky notes, text, live cursors, and presence, synced conflict-free
across everyone on a board.

> **Status: foundation build (v0.1).** This session establishes the architecture
> and boilerplate. The **security session** hardens it — every seam is already
> wired (see [Security hand-off](#security-hand-off)).

---

## Architecture

A **pnpm + Turborepo monorepo**. The Next.js app and the WebSocket server deploy
independently but share one contract layer (types, Zod schemas, RBAC).

```
whiteboard/
├─ apps/
│  ├─ web/          Next.js 15 (App Router) — UI, Auth.js, REST route handlers
│  └─ realtime/     Standalone Yjs WebSocket server (Node) — deploys to Railway/Render/Docker
├─ packages/
│  ├─ shared/       Zod schemas, RBAC, error taxonomy, constants  (used by BOTH apps)
│  ├─ db/           Prisma schema + client singleton
│  ├─ auth/         Auth.js v5 config (edge/node split) + realtime handshake tokens
│  └─ config/       Shared tsconfig / eslint / tailwind presets
├─ docker-compose.yml   Postgres + Redis + MinIO (local dev)
└─ turbo.json
```

| Layer        | Choice                                                        |
| ------------ | ------------------------------------------------------------- |
| Frontend     | Next.js 15 + TypeScript + Tailwind + shadcn/ui                |
| Canvas       | **Fabric.js** (v6)                                            |
| Sync         | **Yjs (CRDT)** over WebSockets, awareness for presence        |
| Auth         | Auth.js v5 (OAuth now; credentials/passkeys/MFA next session) |
| Database     | PostgreSQL + Prisma                                           |
| Cache/PubSub | Redis                                                         |
| File storage | S3-compatible (Cloudflare R2 in prod, MinIO locally)          |

### Why these choices

- **CRDT (Yjs)** gives conflict-free concurrent editing and offline tolerance —
  the correct model for a multi-cursor whiteboard.
- **Monorepo with a shared `packages/shared`** means the API and the realtime
  server validate and authorize against **one** source of truth, so security
  rules can't drift between them.
- **Auth.js edge/node split** keeps the middleware edge-safe (no DB) while the
  Node runtime gets the Prisma adapter and credential provider.

---

## Getting started

Prerequisites: Node 20+, pnpm 9+, Docker.

```bash
# 1. Install (also generates the Prisma client)
pnpm install

# 2. Start infrastructure (Postgres + Redis + MinIO)
pnpm infra:up

# 3. Create the schema + seed a demo board
pnpm db:migrate
pnpm db:seed

# 4. Run everything (web on :3000, realtime on :3001)
pnpm dev
```

Open http://localhost:3000 and click **Open the demo board**. Open it in two
browser windows to watch edits and cursors sync in real time.

### Environment

Two gitignored env files come pre-filled with **dev-only placeholder secrets** so
the app runs immediately:

- **`.env`** (repo root) — read by `docker-compose` and the realtime server.
- **`apps/web/.env.local`** — read by Next.js (its native location).

Both derive from **`.env.example`**, which documents every variable. Before doing
anything real, replace `AUTH_SECRET` and `REALTIME_JWT_SECRET` (must match across
the two files) with `openssl rand -base64 32`. `ALLOW_DEV_ANON_REALTIME=true`
lets the demo board work before credential auth exists.

### Useful scripts

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `pnpm dev`          | Run web + realtime in watch mode (Turbo)      |
| `pnpm build`        | Build all packages and apps                   |
| `pnpm typecheck`    | Type-check the whole workspace                |
| `pnpm lint`         | Lint the whole workspace                      |
| `pnpm db:studio`    | Open Prisma Studio                            |
| `pnpm db:migrate`   | Create/apply a dev migration                  |
| `pnpm infra:up/down`| Start/stop local Postgres + Redis + MinIO     |

---

## How real-time works

1. The browser calls `POST /api/realtime/token` with a `boardId`.
2. The web server verifies the session, resolves the user's **board role**
   (`packages/shared` RBAC), and mints a **60-second, board-scoped JWT**.
3. The browser opens `ws://…/<boardId>?token=…`. The realtime server verifies
   the token **at the HTTP upgrade** — unauthenticated sockets never reach Yjs.
4. The role determines `canWrite`; viewers receive updates but cannot mutate.
5. Document state is persisted (debounced) to `BoardSnapshot` for durability and
   version history.

---

## Security hand-off

The foundation is built so security drops into pre-wired seams without
refactors. Each item below has a placeholder that is safe-by-default (fails
closed) and a marked TODO in the code.

| Area                | Where the seam lives                                         |
| ------------------- | ------------------------------------------------------------ |
| Password hashing    | `packages/auth/src/password.ts` — install Argon2id via `setPasswordHasher()` (currently fails closed) |
| Credential login    | `packages/auth/src/credentials.ts` — lockout, MFA, email-verified checks |
| RBAC enforcement    | `packages/shared/src/rbac.ts` `can()` — already called in API authz + realtime |
| API pipeline        | `apps/web/src/server/api/handler.ts` — auth → validate → rate-limit → handler |
| Rate limiting       | `apps/web/src/server/security/rate-limit.ts` (Redis, fail-open in dev) |
| Security headers/CSP| `apps/web/src/server/security/headers.ts` — tighten CSP to nonce-based |
| Input validation    | `packages/shared/src/schemas/*` — Zod schemas per endpoint/event |
| Realtime hardening  | `apps/realtime/src/collaboration/yjs-ws.ts` — payload cap, write-gating, heartbeat, rate limit |
| Audit logging       | `AuditLog` model in `packages/db/prisma/schema.prisma` |
| Refresh tokens      | `RefreshToken` model (rotation + reuse detection) |
| **Dev backdoor**    | `ALLOW_DEV_ANON_REALTIME` + the anon branch in `apps/web/src/app/api/realtime/token/route.ts` — **delete for production** |

See `OVERVIEW.md` for the full security checklist that guides that session.

---

## Deployment

- **web** → Vercel (`apps/web`).
- **realtime** → Railway / Render / Docker VPS. A `Dockerfile` is provided at
  `apps/realtime/Dockerfile`.
- Provide all secrets via the platform's secret manager (never `.env` files in
  prod). Use managed Postgres/Redis with TLS.

## Notes

- **Prisma client** is generated to a custom output (`packages/db/src/generated`)
  and imported by concrete path. Under pnpm + `moduleResolution: bundler` this is
  the only layout that yields the *full* generated types (the default
  `@prisma/client` output collapses to `any` via a stubbed exports-map entry).
- **`next build` on local Windows** can fail with an `EPERM: scandir` on a
  protected home-directory junction (`Cookies`, `Application Data`): Prisma's
  engine/platform detection globs the user profile during the production
  compile, and those legacy junctions deny directory listing. It does **not**
  affect `pnpm dev` (verified working) and does **not** occur on Linux — build
  and deploy via CI / Vercel / a Linux container (or WSL) as intended.
