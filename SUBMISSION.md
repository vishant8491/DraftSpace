# DraftSpace — Submission & Assessment Hand-off

## 1. Included Directories & Documentation

### Source Directories
- `client/`: React 18, TypeScript, Vite, Tailwind CSS frontend application.
  - `src/components/`: UI components (Navbar, Dashboard, TiptapEditor, EditorToolbar, ShareModal, ImportModal, ConflictModal, RevokedAccessModal, UnsavedChangesModal).
  - `src/api/`: Typed API client with `credentials: 'include'`.
  - `src/types/`: Domain TypeScript interfaces.
- `server/`: Node.js, Express, TypeScript backend application.
  - `src/controllers/`: Document, sharing, file import, and demo session controllers.
  - `src/middleware/`: Authentication, CSRF origin verification, and centralized error handling.
  - `src/utils/`: ProseMirror AST validator, cryptographic token generator, and text decoders.
  - `src/tests/`: Vitest/Supertest integration test suite (`api.test.ts`).
  - `prisma/`: Prisma schemas (`schema.prisma` for PostgreSQL, `schema.sqlite.prisma` for SQLite) and idempotent seed script (`seed.ts`).
  - `scripts/`: Automated database setup and migration detector (`db-setup.js`).

### Documentation & Manifests
- `README.md`: Product overview, quickstart setup, monorepo scripts reference, and demonstration flow.
- `ARCHITECTURE.md`: Detailed architectural design note, data models, concurrency engine, and roadmap.
- `AI_WORKFLOW.md`: Observed facts regarding AI tool usage, modified suggestions, and human decisions.
- `DEPLOYMENT.md`: Complete operations manual, environment variable reference, and hosting guide.
- `QA_REPORT.md`: Release verification audit report with defect log, regression coverage, and evidence.
- `WALKTHROUGH_SCRIPT.md`: Timed 3–5 minute presentation recording outline.
- `WALKTHROUGH_URL.txt`: Walkthrough video link placeholder.
- `render.yaml`: Render Blueprint infrastructure specification.
- `Dockerfile`: Multi-stage production container build.
- `docker-compose.yml`: Production PostgreSQL + DraftSpace service stack.
- `railway.toml`: Railway Nixpacks build and deploy configuration.

---

## 2. Live Product URL & Deployment Status

- **Status:** **BLOCKED on External Cloud Host Provisioning / Remote Git Push**.
- **Reason:** In accordance with assessment instructions, no fabricated or placeholder URL is submitted as a live product. No cloud provider accounts (Render, Railway, Fly.io, AWS) or remote Git remotes are configured in this local environment.
- **Local Production Server:** Fully operational and verified on `http://localhost:4000/`.
- **Cloud Deployment Ready:** Ready for 1-click deployment via [render.yaml](file:///c:/documentsOfMine/DraftScape/render.yaml) or Docker Compose once a remote Git repository is provided.

---

## 3. Demo Users & Access Instructions

DraftSpace comes pre-seeded with three demo personas selectable from the top-right header menu:

| User | Email | Role / Purpose |
|---|---|---|
| **Alice Smith** | `alice@draftspace.dev` | **Document Owner** (owns initial specification; can rename titles and manage collaborators) |
| **Bob Jones** | `bob@draftspace.dev` | **Shared Collaborator** (collaborator on Alice's spec; can edit content, cannot rename or manage shares) |
| **Charlie Brown** | `charlie@draftspace.dev` | **Unshared User** (unauthorized; private documents are strictly inaccessible with HTTP 403) |

---

## 4. Local Setup Reference

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example server/.env

# 3. Setup database & seed demo accounts
npm run db:setup

# 4. Start local development
npm run dev

# 5. Or build and run production single-origin server
npm run build && npm start
```

---

## 5. Test Command & Actual Results

```bash
npm test
```

### Actual Execution Evidence:
- **Test Runner:** Vitest v2.1.9 with Supertest v7.0.0.
- **Results:** **47 passed across 8 test suites (0 failed)** in 2.64s.
- **Coverage:** Session crypto, body spoofing immunity, OCC atomic increments, 409 conflict detection, RBAC permission denial, owner-only renames, complete sharing revocation lifecycle, multilingual UTF-8 `.txt` import, rich-text round-trip persistence, and malformed ID edge cases.

---

## 6. Working Functionality

- **Document Creation & Renaming**: Owner can rename titles with 1–120 character limits; whitespace is trimmed; blur auto-reverts empty titles to `'Untitled Document'`.
- **Rich-Text Formatting**: Heading 1, Heading 2, Bold, Italic, Underline, Bulleted lists, Numbered lists, Blockquotes, Code blocks, and text alignment.
- **Serialized Autosave Engine**: 800ms debounce with in-flight request mutex (`isSavingRef`), revision tracking, and caret preservation.
- **Optimistic Concurrency Control (OCC)**: Integer versioning with atomic Prisma updates; stale saves return HTTP 409 Conflict and trigger the `ConflictModal`.
- **Role-Based Access Control**: Non-owners cannot rename (403), grant shares (403), revoke shares (403), or delete documents (403). Mixed updates are rejected atomically.
- **Access Revocation Handling**: Revoking access immediately blocks future reads and writes; client catches 403, cancels autosave, and preserves draft in `RevokedAccessModal`.
- **Unsaved Changes Protection**: Switching accounts or logging out while edits are uncommitted triggers `UnsavedChangesModal`.
- **File Import**: Supports UTF-8 `.txt` up to 1 MiB with BOM stripping, zero-byte rejection, binary null-byte rejection, and plain text paragraph generation.
- **Single-Origin Static Serving**: Express serves the React SPA with SPA fallback, returning 404 JSON for missing assets.

---

## 7. Partial / Incomplete Functionality

- **Real-Time Collaborative Editing (CRDT / Operational Transformation)**: Concurrency is managed via Optimistic Concurrency Control (OCC) with 409 conflict resolution rather than simultaneous multi-cursor websockets.
- **File Formats Beyond Plain Text**: Markdown (`.md`) and Word (`.docx`) imports are explicitly excluded by design.

---

## 8. Known Limitations

1. **Mocked Demo Authentication**: Intended for frictionless reviewer evaluation; not connected to production external OAuth providers.
2. **Database Engine**: Local development utilizes SQLite; production deployment utilizes PostgreSQL.

---

## 9. Next Steps with Another 2–4 Hours

1. **Presence Awareness & Active Collaborator Avatars (1 hour)**: Lightweight heartbeat endpoint displaying active collaborators in the header.
2. **Document Export (45 minutes)**: Export documents as `.txt` or styled HTML.
3. **Revision History Drawer (1 hour)**: Snapshot table allowing users to review and restore prior versions.
4. **Interactive Comment Threads (45 minutes)**: Inline text selection comments using ProseMirror decorations.

---

## 10. Walkthrough Video Location

- Walkthrough script: [WALKTHROUGH_SCRIPT.md](file:///c:/documentsOfMine/DraftScape/WALKTHROUGH_SCRIPT.md)
- Walkthrough URL: [WALKTHROUGH_URL.txt](file:///c:/documentsOfMine/DraftScape/WALKTHROUGH_URL.txt) *(Currently pending recording by reviewer/user)*

---

## 11. Unresolved Submission Blockers

1. **Cloud Hosting Provisioning**: Pushing to a remote Git repository (GitHub/GitLab) and deploying on Render via [render.yaml](file:///c:/documentsOfMine/DraftScape/render.yaml).
2. **Screen Recording Walkthrough**: Recording the 3–5 minute presentation video following [WALKTHROUGH_SCRIPT.md](file:///c:/documentsOfMine/DraftScape/WALKTHROUGH_SCRIPT.md) and inserting the public video link into `WALKTHROUGH_URL.txt`.
3. **Google Drive Packaging**: Uploading the final clean source archive and documentation to the designated Google Drive submission folder.
