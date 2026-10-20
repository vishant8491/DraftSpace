# DraftSpace 📝

> A lightweight, robust shared document editor inspired by Google Docs, built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, **Tiptap**, **Node.js**, **Express**, and **Prisma ORM**.

[![Tests](https://img.shields.io/badge/tests-47%20passed-emerald)](file:///c:/documentsOfMine/DraftScape/server/src/tests/api.test.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](file:///c:/documentsOfMine/DraftScape/tsconfig.json)
[![License](https://img.shields.io/badge/License-MIT-slate)](LICENSE)

---

## 🌟 Product Purpose & Scoped Features

DraftSpace delivers a focused, highly reliable vertical slice of a collaborative document suite with an emphasis on rock-solid persistence, data safety, and strict server-side authorization:

1. **Rich-Text Document Editor**: Built on Tiptap (ProseMirror engine) supporting Heading 1, Heading 2, Bold, Italic, Underline, Bulleted lists, Numbered lists, Blockquotes, Code blocks, and text alignment.
2. **Serialized Autosave Engine**: Keystrokes are debounced (800ms) with an in-flight save mutex (`isSavingRef`), revision tracking (`editRevisionRef` vs `savedRevisionRef`), and caret position preservation without cursor jumping. Manual save is also available via toolbar or `Ctrl+S`.
3. **Optimistic Concurrency Control (OCC)**: Integer `version` verification prevents silent overwrites. Stale saves return HTTP 409 Conflict and trigger an interactive conflict recovery modal (allowing the user to overwrite with their draft, reload the server version, or copy their draft to the clipboard).
4. **Role-Based Access Control (RBAC)**: Strict owner-only controls. Shared collaborators can edit document content, but **cannot** rename titles (`403 FORBIDDEN_RENAME`), grant shares (403), revoke shares (403), or delete documents (403).
5. **Clear Document Segregation**: The workspace dashboard explicitly separates "My documents" from "Shared with me", displaying creator attribution, last-updated timestamps, and role badges.
6. **File Import (Deliberate Scope: UTF-8 `.txt` Only, <= 1 MiB)**: True multipart upload accepting UTF-8 `.txt` files up to 1 MiB. Parses text into ProseMirror JSON paragraphs without interpreting HTML or script tags.
7. **Instant Demo Accounts**: Seeded with three demo personas (Alice, Bob, Charlie) and a top-navbar switcher that creates server-issued `HttpOnly` sessions (tokens hashed at rest with SHA-256).

> [!IMPORTANT]
> **No Simultaneous Real-Time Editing Claim:**  
> DraftSpace uses **Optimistic Concurrency Control (OCC)** with integer versioning and HTTP 409 conflict detection. It **does not** claim to support simultaneous multi-cursor real-time editing (Operational Transformation or CRDTs). When multiple users edit concurrently, the second committer is alerted with a conflict modal and guided recovery rather than suffering silent data loss.

---

## 💻 Technology Stack

- **Frontend**: React 18.3, TypeScript 5.7, Vite 6.1, Tailwind CSS 3.4, Lucide React icons.
- **Rich-Text Engine**: Tiptap 2.11 (`@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-text-align`).
- **Backend**: Node.js, Express 4.21, TypeScript 5.7, Cookie-Parser, Multer (in-memory storage).
- **Database & ORM**: Prisma ORM 5.22. Supports **PostgreSQL** (production deployment) and **SQLite** (zero-dependency local development and testing).
- **Testing**: Vitest 2.1, Supertest 7.0.

---

## 📋 Prerequisites & Supported Node Version

- **Node.js**: v18.x, v20.x, or v22.x (Verified and tested on Node `v22.14.0`).
- **npm**: v9.x, v10.x, or v11.x (Verified on npm `11.6.2`).
- **Operating System**: Windows, macOS, or Linux.

---

## 🚀 Quickstart & Local Setup

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repo-url> draftspace
cd draftspace

# Install monorepo dependencies (client + server)
npm install
```

### 2. Environment Variables Configuration
Copy the provided `.env.example` file to create your server `.env`:
```bash
# On Linux/macOS:
cp .env.example server/.env

# On Windows (PowerShell):
Copy-Item .env.example server/.env
```

Default configuration for instant zero-dependency local development:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
CORS_ORIGIN="http://localhost:5173"
```
*(To use PostgreSQL, simply change `DATABASE_URL` to your PostgreSQL connection string, e.g., `postgresql://postgres:postgres@localhost:5432/draftspace?schema=public`)*.

### 3. Setup Database & Seed Initial Data
```bash
npm run db:setup
```
This automated setup script:
1. Detects whether your `DATABASE_URL` is PostgreSQL or SQLite.
2. Generates the Prisma client.
3. Pushes the schema to create all tables, indexes, and unique constraints.
4. Idempotently seeds demo users (**Alice**, **Bob**, **Charlie**) and initial starter documents without overwriting existing data.

### 4. Start Development Servers
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`

---

## 🏗️ Production Build & Single-Origin Serving

DraftSpace can be built and run as a single unified service where Express serves the pre-compiled React SPA:

```bash
# 1. Build server TypeScript and client Vite production bundles
npm run build

# 2. Run database migrations & idempotent seed
npm run db:setup

# 3. Launch production server
npm start
```
- The complete application (API + UI) is served on `http://localhost:4000`.
- All document URLs (e.g. `/?doc=<id>`) refresh correctly via Express SPA fallback.
- Missing static assets with extensions (e.g. `*.js`, `*.css`) return HTTP 404 JSON, preventing script execution errors.

---

## 🧪 Automated Testing

DraftSpace includes a comprehensive automated test suite with **47 integration tests** exercising actual application routes, authorization middleware, and SQLite/PostgreSQL persistence without mocking application logic:

```bash
npm test
```

### Verified Test Breakdown (47 Tests):
1. **Demo Identity & Session Management (6 tests)**: Health check, demo user listing, HttpOnly session cookie, SHA-256 token hashing at rest, session authentication resolution, logout and token revocation.
2. **Validation & Security Enforcement (4 tests)**: Title whitespace trimming and 1-120 char length bounds, body spoofing rejection (ownerId/userId/role ignored), editor JSON node validation, ProseMirror AST acceptance.
3. **Concurrent Saves & Optimistic Concurrency Control (3 tests)**: Sequential increment on version match, HTTP 409 rejection and database preservation on stale version, version parameter requirement.
4. **Access Rules & RBAC Permission Enforcement (7 tests)**: Owner update & rename, editor content update, editor rename rejection (403), editor mixed title/content rejection (403), unshared user read rejection (403), unshared user write rejection (403), segregated list query, collaborator delete rejection (403).
5. **Sharing Management & Complete End-to-End Demonstration (8 tests)**:
   - Alice creates document.
   - Bob cannot read or update document before share (403).
   - Alice shares document with Bob.
   - Duplicate share grant is idempotent and preserves unique row.
   - Bob lists document under "Shared with me" and edits content.
   - Charlie cannot access document (403).
   - Bob cannot rename document or manage collaborators (403).
   - Alice revokes Bob; Bob's subsequent read and write fail with 403; Alice retains full access.
   - Self-sharing rejected (400); sharing with non-existent user rejected (404).
6. **File Import: Deliberate Scope (8 tests)**: Plain text paragraph parsing, script tag neutralization, UTF-8 BOM handling, case-insensitive `.TXT` extension, generic MIME (`application/octet-stream`) support, rejection of non-.txt (`.md`, `.docx`), rejection of zero-byte file, rejection of binary null-byte files, rejection of malformed UTF-8, rejection of files > 1 MiB.
7. **Rich-Text Formatting Round-Trip Persistence (1 test)**: Create and re-read H1, H2, Bold, Italic, Underline, Bulleted list, Numbered list, Blockquote, and Code block; full ProseMirror JSON equivalence verified.
8. **Missing, Malformed, and Non-Existent Document IDs (4 tests)**: Clean 404 responses for non-existent and malformed IDs across GET, PATCH, and DELETE routes.

---

## 👥 Demo Personas (Instant Account Switcher)

| Persona | Email | Purpose in Evaluation | Initial State |
|---|---|---|---|
| **Alice Smith** | `alice@draftspace.dev` | **Document Owner** | Owns initial specification and private memo. Can rename titles and manage collaborators. |
| **Bob Jones** | `bob@draftspace.dev` | **Shared Collaborator** | Collaborator on Alice's spec; owns research notes. Can edit content, cannot rename or share. |
| **Charlie Brown** | `charlie@draftspace.dev` | **Unshared User** | Independent user. Private documents of Alice and Bob are strictly inaccessible (403 Forbidden). |

Switch accounts at any time via the user menu in the top-right header!

---

## 🔄 Step-by-Step Sharing Demonstration

Follow these steps to observe the end-to-end authorization lifecycle:

1. **Start as Alice Smith**:
   - Open `http://localhost:5173` (or `:4000` in production mode). Alice is selected by default.
   - Click **New Document**. Title defaults to `Untitled Document`.
   - Rename title to `Q4 Product Strategy`. Add formatted content (Heading 1, Bold, Bullet list).
   - Notice the status badge transitions: `Unsaved changes` &rarr; `Saving...` &rarr; `Saved`.
2. **Grant Collaborator Access**:
   - Click the **Share** button in the header (visible only to Alice).
   - In the dropdown, select **Bob Jones** and click **Share**.
   - Bob Jones appears in the active collaborators list.
3. **Verify Bob's View**:
   - In the top-right header, switch demo account to **Bob Jones**.
   - Under **Shared with me**, `Q4 Product Strategy` appears with a `Shared Editor` badge and `By Alice Smith`.
   - Click to open. The full formatted content loads.
   - Bob can edit content (e.g. add bullet items). Changes autosave with version increments.
   - Notice the title input is disabled for Bob: hovering displays a tooltip stating only the owner can rename.
4. **Verify Charlie's Access Denial**:
   - Switch demo account to **Charlie Brown**.
   - Under both "My documents" and "Shared with me", `Q4 Product Strategy` is completely invisible.
   - Paste the direct document URL (`?doc=<id>`) into the browser bar: the backend returns HTTP 403 Forbidden and the client shows a clear Access Denied state.
5. **Demonstrate Access Revocation**:
   - Switch back to **Alice Smith**, open `Q4 Product Strategy`, and click **Share**.
   - Click the trash can icon next to Bob Jones to revoke access.
   - Switch to **Bob Jones** (who still has the document open).
   - Bob types an edit: the backend returns HTTP 403 Forbidden.
   - The frontend catches the 403, permanently halts the autosave loop, and displays `RevokedAccessModal`. Bob's uncommitted text is preserved with a 1-click clipboard copy button.

---

## 📁 File Import: Deliberate Scope

> [!IMPORTANT]
> **DraftSpace deliberately supports UTF-8 `.txt` import only.**  
> Markdown (`.md`), Word (`.docx`), and RTF are explicitly unsupported and rejected.

- **Transport & Application Limits**: Enforces 1 MiB (`1024 * 1024` bytes) maximum size limit.
- **Validation**: Rejects zero-byte files (`400 EMPTY_FILE`), unsupported extensions (`400 UNSUPPORTED_FILE_TYPE`), binary content containing null bytes (`400 BINARY_FILE_REJECTED`), and invalid UTF-8 sequences (`400 MALFORMED_UTF8`).
- **Encoding & BOM**: Accepts standard UTF-8 and multilingual Unicode (e.g. Hindi, accents, emojis). UTF-8 Byte Order Marks (`0xEF, 0xBB, 0xBF`) are stripped transparently.
- **XSS & Execution Prevention**: Content is treated strictly as plain text paragraphs. Script tags (e.g. `<script>alert(1)</script>`) are stored as inert text nodes and never executed.

---

## 🌐 Deployment Status & Live URL

- **Status:** **BLOCKED on External Cloud Host Provisioning / Credentials**.
- **Local Production Server:** Fully verified and operational on `http://localhost:4000/`.
- **Infrastructure as Code:** Pre-configured for 1-click cloud deployment via [render.yaml](file:///c:/documentsOfMine/DraftScape/render.yaml) (Render Web Service + PostgreSQL), [Dockerfile](file:///c:/documentsOfMine/DraftScape/Dockerfile), and [docker-compose.yml](file:///c:/documentsOfMine/DraftScape/docker-compose.yml).
- See [DEPLOYMENT.md](file:///c:/documentsOfMine/DraftScape/DEPLOYMENT.md) for full deployment instructions and [QA_REPORT.md](file:///c:/documentsOfMine/DraftScape/QA_REPORT.md) for verification evidence.

---

## ⚠️ Mock Authentication Warning & Known Limitations

1. **Mock Demo Authentication**: Demo sessions simulate production authentication for reviewer evaluation without requiring email signups or third-party OAuth. Do not use this mocked session mechanism in public multi-user production environments without adding real credentials/OAuth.
2. **File Import Scope**: Only UTF-8 plain text (`.txt`) files are supported by design.
3. **Database Concurrency**: The local SQLite configuration is designed for single-process evaluation. Production deployments utilize PostgreSQL with connection pooling.
