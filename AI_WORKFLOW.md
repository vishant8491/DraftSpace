# DraftSpace — AI Collaboration & Engineering Workflow Note

## 1. AI Tools Actually Used

- **AI Platform**: Google DeepMind Antigravity AI Assistant.
- **Workflow Modality**: Autonomous pair-programming with file inspection, code generation, terminal execution, and iterative regression testing.

---

## 2. Tasks Where AI Accelerated Work

1. **Monorepo Scaffolding & Setup**: Rapid generation of npm workspace configuration linking `server` (Express + TypeScript) and `client` (React + Vite + Tailwind).
2. **Prisma Relational Modeling**: Authored data schemas with foreign key cascades, unique constraints (`@@unique([documentId, userId])`), and dual database provider support (PostgreSQL and SQLite).
3. **Automated Integration Test Suite**: Generated 47 Supertest/Vitest integration tests covering session cryptography, token hashing, OCC version incrementing, 409 conflict detection, RBAC permission denial, sharing revocation lifecycle, and file import security checks.
4. **Tiptap ProseMirror Integration**: Integrated Tiptap extensions and built an accessible Google Docs inspired toolbar with active formatting states, keyboard shortcuts (`Ctrl+B`, `Ctrl+I`, `Ctrl+U`, `Ctrl+S`), and page canvas layout.
5. **Deployment Manifests**: Authored declarative Infrastructure-as-Code files including `render.yaml` Blueprint, multi-stage `Dockerfile`, `docker-compose.yml`, and `railway.toml`.

---

## 3. Actual Generated Suggestions Modified or Rejected

During the implementation process, several AI suggestions were evaluated, modified, or rejected to protect application integrity:

1. **Rejected: Blind Overwrite on Account Switch / Logout**
   - *AI Proposal*: Switching accounts via the top-right dropdown immediately invalidated the active session and rendered the new account's dashboard.
   - *Issue*: If a user had unsaved edits in an open document, switching accounts or clicking logout instantly discarded their in-flight draft.
   - *Engineering Modification*: Routed `onSwitchUser` and `onLogout` through the `attemptNavigation` pipeline. If the document has uncommitted edits, the `UnsavedChangesModal` intercepts the action, offering "Save & Proceed", "Discard Changes & Leave", or "Stay Here".

2. **Modified: Seed Script Resetting Existing Documents on Restart**
   - *AI Proposal*: The initial database seed script (`seed.ts`) used `prisma.document.upsert()` with an `update` payload resetting `doc_starter_spec`, `doc_bob_notes`, and `doc_alice_private` back to version 1 and default text on every run.
   - *Issue*: When deployed to production, container restarts or redeployment hooks would wipe out reviewer edits and reset document versions.
   - *Engineering Modification*: Changed the `update` block in `seed.ts` to `{}` for all documents. Existing documents and version counters are strictly preserved on container restart, while fresh databases still receive starter seed data.

3. **Rejected: Fragile Real-Time Socket Mock**
   - *AI Proposal*: Suggestion to add a basic WebSocket connection for multi-user editing.
   - *Issue*: Basic WebSockets without full Operational Transformation (OT) or Conflict-free Replicated Data Types (CRDTs) produce frequent race conditions, out-of-order writes, and silent data loss.
   - *Engineering Modification*: Prioritized rock-solid Optimistic Concurrency Control (OCC) with atomic database version checks, clear HTTP 409 conflict detection, and an interactive recovery flow.

4. **Modified: Blanket SPA Fallback Intercepting Missing Static Assets**
   - *AI Proposal*: Using `app.get('*', (req, res) => res.sendFile(indexHtml))` to serve the React application.
   - *Issue*: If a browser requested a missing static asset with an extension (e.g. `/assets/chunk-missing.js`), Express returned `index.html` with HTTP 200, causing browser syntax errors (`Uncaught SyntaxError: Unexpected token '<'`).
   - *Engineering Modification*: Added a regex check (`/\.[a-zA-Z0-9]+$/`) to immediately return HTTP 404 JSON for missing assets, while allowing document URLs and clean routes to fall back to `index.html`.

5. **Modified: Headless Browser Driver Failure Handling**
   - *AI Proposal*: Attempted to run automated visual browser passes via Playwright.
   - *Issue*: The environment's Playwright runner failed to download `playwright-1.57.0-win32_x64.zip` due to an HTTP 404 from upstream Microsoft Azure CDN.
   - *Engineering Modification*: In strict adherence to QA integrity, browser tests were marked **"Not run"** in `QA_REPORT.md` rather than fabricating visual passes, while all HTTP endpoints and API routes were verified live.

---

## 4. Human Decisions & Tradeoffs

1. **Deliberate Scope on Plain-Text Import**: File import was restricted strictly to UTF-8 `.txt` (<= 1 MiB) with fatal UTF-8 decoding and null-byte checks, rather than attempting fragile partial conversions of `.docx` or `.md`.
2. **Dual-Adapter Database Architecture**: Configured Prisma for both PostgreSQL (`schema.prisma` for cloud production) and SQLite (`schema.sqlite.prisma` for zero-friction local development and automated testing) via an automated detector script (`db-setup.js`).
3. **Strict Server-Side Permission Enforcement**: Enforced all permission logic (owner-only renames, owner-only sharing, atomic rejection of mixed updates) on the server rather than trusting client-side flags.

---

## 5. Validation Actually Performed

- **Server TypeScript Check**: `npx tsc --noEmit` &rarr; 0 errors.
- **Client TypeScript Check**: `npx tsc -b` &rarr; 0 errors.
- **Monorepo Production Build**: `npm run build` &rarr; Compiled in 30.30s (0 errors).
- **Automated Integration Tests**: `npm test` &rarr; **47 out of 47 tests passed** in 2.64s.
- **Single-Origin Live HTTP Verification**: Tested `GET /api/health` (200), `GET /` (200 HTML), `GET /?doc=doc_starter_spec` (200 HTML), `GET /assets/nonexistent.js` (404 JSON), `GET /api/nonexistent-route` (404 JSON).

---

## 6. Remaining Limitations

1. **Cloud Deployment Provisioning**: Cloud deployment is pending external host credentials and remote Git repository creation.
2. **Mocked Authentication**: The demo session switcher is intended for assessment evaluation and is not connected to production OAuth providers.
3. **No Real-Time Sockets**: Concurrency is managed via Optimistic Concurrency Control (OCC) rather than real-time multi-cursor collaboration.
