# Dashboard Backlog

Lean, sprint-oriented backlog for the post-login **dashboard** experience.
Stories are small, independently shippable, sized (S/M/L), and prioritized
(P0 = blocks the core loop). Sequenced for a quick local agile cadence.

> **Scope note:** Items marked _Deferred to security session_ depend on RBAC /
> auth hardening and must **not** be started until that work lands.

---

## Epics

- **E1 — Board lifecycle** (create / open / rename / delete) — closes the broken loop
- **E2 — Dashboard shell** (sidebar, topbar, layout)
- **E3 — Discovery** (filters, search, sort, views)
- **E4 — Board card actions** (menu, star, archive/trash)
- **E5 — Workspace context** (switcher, scoping)

---

## Sprint 1 — "Make it usable" (P0, close the core loop) ✅ Done

| ID   | Story                                                              | Size | Depends |
| ---- | ------------------------------------------------------------------ | ---- | ------- |
| S1.1 | `POST /api/boards` route (Zod + auth + create → return id)         | M    | —       |
| S1.2 | "+ New board" button → calls S1.1 → redirects into canvas          | S    | S1.1    |
| S1.3 | Board card = thumbnail placeholder + name + updated + role badge   | S    | —       |
| S1.4 | Empty state with CTA (replace "next milestone" text)               | S    | S1.2    |
| S1.5 | Delete board (soft-delete → `archivedAt`) with confirm             | S    | S1.1    |

**Sprint goal:** a user can create, open, and delete boards.
**Acceptance:** zero dead-ends in the create → edit → return flow.

---

## Sprint 2 — "Shell & organize" (P1) ✅ Done

| ID   | Story                                                            | Size | Depends |
| ---- | --------------------------------------------------------------- | ---- | ------- |
| S2.1 | Dashboard layout shell (sidebar + topbar) as route-group layout | M    | —       |
| S2.2 | Filter tabs: Recent · My boards · Shared with me (query variants)| M    | S1.3    |
| S2.3 | Search boards by name (debounced)                               | S    | S2.1    |
| S2.4 | Grid/List toggle + sort (recent / name)                         | S    | S2.1    |
| S2.5 | Card `⋯` menu: Rename · Duplicate · Archive · Delete            | M    | S1.5    |

**Sprint goal:** navigable, filterable dashboard that scales past ~10 boards.

---

## Sprint 3 — "Context & polish" (P2) ✅ Done

| ID   | Story                                             | Size | Depends |
| ---- | ------------------------------------------------- | ---- | ------- |
| S3.1 | Workspace switcher (Org → Workspace scoping)      | M    | S2.1    |
| S3.2 | Star / favorite + Starred view                    | S    | S2.5    |
| S3.3 | Trash view + restore                              | S    | S1.5    |
| S3.4 | Real board thumbnails (canvas snapshot on save)   | L    | S1.1    |
| S3.5 | Templates gallery (2–3 starters)                  | M    | S1.1    |

---

## Deferred to security session (do not start — needs RBAC)

- Share-links panel
- Member / presence avatars on shared cards
- Activity feed / audit log surface
- Invitations
- Org / team admin

---

## Sprint 4 — "Collaborative workspaces" ✅ Done

Turns the schema-only sharing model into a working, **collaborative-by-default**
team experience, plus trash retention.

> **Status: complete and verified.** All 10 stories shipped. One follow-on
> carved out to Sprint 5: share-link **redemption** (generating/managing links
> works; visitors gaining access via `/share/<token>` is S5.1).

### Role model

- **Workspace roles:** Owner · Admin · **Member** (collaborative default) · Viewer
  (read-only). No Guest/Editor at the workspace level.
- **Member** can create boards and edit boards they can access.
- **Board roles unchanged:** Owner · Admin · Editor · Viewer · Guest.

### Inheritance rules (core logic)

- Owner/Admin (workspace) → **same role on every board**; never downgraded per board.
- Member (workspace) → **Editor by default** on workspace boards; overridable per
  board (Editor/Viewer/Guest).
- Viewer (workspace) → **Viewer by default**; upgradable per board.
- Board grant **overrides** the workspace default (upgrade freely; explicit
  downgrade only for Member/Viewer, never Owner/Admin).

### Stories

| ID    | Story                                                                                             | Size | Depends       |
| ----- | ------------------------------------------------------------------------------------------------- | ---- | ------------- |
| S4.1  | RBAC split — `WORKSPACE_ROLES` (Owner/Admin/Member/Viewer) + `workspaceRole → default boardRole`  | M    | —             |
| S4.2  | Schema/migration — `WorkspaceRole` enum; migrate existing `WorkspaceMember.role`                  | M    | S4.1          |
| S4.3  | `resolveBoardRole` rewrite — inheritance + override + "Owner/Admin never downgraded"               | M    | S4.1, S4.2    |
| S4.4  | Create workspace — `POST /api/workspaces` + "New workspace" in switcher (creator = Owner)         | M    | S4.2          |
| S4.5  | Invite / accept members — invite by email + workspace role; wire `Invitation` accept flow         | L    | S4.4          |
| S4.6  | Members list + role editing — list visible to all; Owner/Admin can change role / remove members   | M    | S4.5          |
| S4.7  | Board sharing UI — grant per-board role to a member or external guest (collaborators + share links) | L  | S4.3          |
| S4.8  | Board-create default — new boards auto-inherit workspace membership (no explicit collaborator rows) | S  | S4.3          |
| S4.9  | Trash retention — `TRASH_RETENTION_DAYS = 30` + scheduled purge: hard-delete boards archived > 30d (cascade thumbnails, stars, collaborators, snapshots, shares) | M | S3.3 |
| S4.10 | Enforcement + audit — update all permission checks; audit-log member/role changes; rate-limit invites | M | S4.5      |

**Sprint goal:** a user can create a workspace, invite people who collaborate by
default, see and manage everyone's role, and trash auto-empties after 30 days.

**Suggested order:** S4.1 → S4.2 → S4.3 (model first), then S4.4 → S4.5 → S4.6
(team flows), then S4.7 → S4.8, with S4.9 / S4.10 alongside.

---

## Sprint 5 — "Live-sync & board-access fixes" ✅ Done

Fixes surfaced from real use: realtime edits weren't propagating between users,
view-only users could still manipulate the canvas locally, and board collaborator
roles couldn't be adjusted after granting.

### Stories

| ID   | Story                                                                                                          | Size | Depends |
| ---- | ------------------------------------------------------------------------------------------------------------- | ---- | ------- |
| S5.1 | Tune realtime throughput (#1) — raise `RATE_LIMITS.REALTIME_EVENTS` to a realistic value **and** throttle/batch client cursor + drawing updates so live-edit frames aren't dropped. Root cause of the dropped-`sync`-frame warning and edits not appearing for other users. | M | S4.7 |
| S5.2 | Enforce view-only on the canvas (#2) — when the board role lacks `board:edit` (Viewer/Guest), make the Fabric canvas read-only: no selection, moving, drawing, or object edits. Server already blocks writes (`canWrite`); this is correct UX + defense-in-depth. | S | — |
| S5.3 | Board-level role editor (#3) — add a per-collaborator role dropdown in the board Share dialog to change an existing collaborator's role (matching the workspace members list); today only add/remove exist. | S | S4.7 |

**Sprint goal:** collaborators see each other's edits live, viewers genuinely
cannot edit, and board access can be adjusted per person without re-adding them.

**Suggested order:** S5.1 (unblocks sync) → S5.2 → S5.3.

### Defects (found in review)

| ID   | Defect                                                                                                                                                                                                                                                    | Size |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| D5.1 | Share dialog leaks self/owner — mark the current user "(you)", disable editing/removing your **own** row, and hide the board **owner**. Move board-member role **editing** out of the Share dialog into a **"Board access" tab in the Members page** (view members per board + edit their access). | M |
| D5.2 | Redesign the Share dialog (modern) — two access **scopes**: **Board** and **Workspace**; grant via **email invite** or **share link**; default roles workspace → **Member**, board → **Viewer**.                                                          | M |
| D5.3 | Board canvas shows scrollbars — remove them; **pan** the board by dragging and **zoom** with the mouse wheel (scrolling must not scroll the page).                                                                                                        | S |
| D5.4 | Harden sign-out (local) — on sign-out, clear **all** auth cookies (`authjs.session-token`, `authjs.csrf-token`, `authjs.callback-url`) and `router.refresh()` to purge the Next.js client Router Cache, so no trace of the previous user survives in the tab. NOTE: token **revocation** / "sign out everywhere" (all devices) needs a server-side session store — deferred to **Sprint 7**. | S |
| D5.5 | Auth flow logging — file-based (**not console**) logger writing time-based JSON-line files to a repo-root `logs/` dir (`auth-YYYY-MM-DD.log`). Route Auth.js `events` (sign-in/out, createUser, linkAccount) + internal `logger` (errors/warnings) to it. Safe fields only — never tokens/passwords/secrets (Guideline #16). | S |

**Defect order:** D5.3 (canvas nav) → D5.2 (dialog redesign) → D5.1 (self/owner + Members board tab) → D5.4 (sign-out hardening) → D5.5 (auth logging).

---

## Sprint 6 — "Sharing completion & collaboration visibility"

Finishes the sharing story Sprint 4 started (links generate but don't yet grant
access), turns on real email invitations, and makes collaboration visible.

### Stories

| ID    | Story                                                                                                          | Size | Depends |
| ----- | ------------------------------------------------------------------------------------------------------------- | ---- | ------- |
| S6.1  | **Build the share-link redemption flow** — `/share/<token>` route: validate token (not revoked/expired), resolve `access`+`role`, grant the visitor access (materialize a collaborator/guest grant, or serve a public board), then open the board. Add the token→access path to `resolveBoardRole`. | L | S4.7 |
| S6.2  | Transactional email delivery — integrate a provider (Resend/SMTP) behind a small interface; foundation for invites, verification, and resets. | M | — |
| S6.3  | Pending email invitations + accept-on-signup — invite unknown emails (create `Invitation`), email the link, materialize membership/board grant on accept. Wire `Invitation` for workspace **and** board. | L | S6.2 |
| S6.4  | Guest access — guest role via share link/invite, with a minimal, restricted guest UI.                          | M | S6.1 |
| S6.5  | Presence & member avatars — live presence + collaborator avatars on the board and on shared dashboard cards.   | M | — |
| S6.6  | Activity feed / audit-log surface — read `AuditLog` into a workspace activity view (Owner/Admin).              | M | S4.10 |
| S6.7  | In-board sharing & presence — Share button + presence indicators in the board page header (not just cards).    | S | S6.1, S6.5 |
| S6.8  | Confirm before removal — an "Are you sure?" modal before removing a member from a workspace or a collaborator from a board; change the remove icon from **X** to a **trash can**.                                                                | S | — |
| S6.9  | Settings — a Settings page where a user can change their **display name**, upload an **avatar**, and (Owner/Admin) rename the **workspace**.                                                                                                      | M | — |

**Sprint goal:** a share link actually lets someone in, invitations reach people
who don't have an account yet, and you can see who has access and who's online.

**Suggested order:** **S6.1** first (closes the Sprint 4 gap), then S6.2 → S6.3
(email + invitations), with S6.5 / S6.6 alongside; S6.4 and S6.7 last.

---

## Sprint 7 — "Security hardening" (OWASP, per OVERVIEW.md) — planned

The dedicated security pass deferred throughout: Argon2id password auth, email
verification, password reset, MFA (TOTP), passkeys, account lockout, refresh-token
rotation + session management, device/login history, CSP/HSTS and the full
security-header set, upload scanning + signed-URL object storage, WebSocket/WebRTC
auth hardening, dependency scanning, and penetration testing. Scope from the
Cyber Security Guidelines in OVERVIEW.md when this sprint starts.

---

## Working agreements

- **Definition of Done:** typechecks · Zod-validated route · works against seeded
  data · no console errors.
- **Vertical slices:** every story ships UI **+** its route together — never a
  button without a backend.
- **One story in-progress at a time** (mirror it in the todo list).
- **Critical path:** S1.1 → S1.2 → S2.1 → everything else. Start there.
