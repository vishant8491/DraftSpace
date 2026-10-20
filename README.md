# DraftSpace 📝

> A lightweight, modern shared document editor inspired by Google Docs, built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, **Tiptap**, **Node.js**, **Express**, and **Prisma ORM**.

[![Tests](https://img.shields.io/badge/tests-38%20passed-emerald)](file:///c:/documentsOfMine/DraftScape/server/src/tests/api.test.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](file:///c:/documentsOfMine/DraftScape/tsconfig.json)
[![License](https://img.shields.io/badge/License-MIT-slate)](LICENSE)

---

## 🌟 Overview & Highlights

DraftSpace delivers a focused, secure vertical slice of a collaborative document suite:
1. **Rich-Text Editing in the Browser**: Powered by Tiptap with formatting (Bold, Italic, Underline, Headings H1/H2/H3, Bulleted & Numbered lists, Blockquotes, Code blocks, and text alignment).
2. **Persistent Database Storage & Serialized Auto-Save**: Debounced auto-save (800ms) with in-flight mutex, revision tracking, and caret preservation without cursor jumping + manual `Ctrl+S` shortcut.
3. **Optimistic Concurrency Control (OCC)**: Integer `version` verification prevents lost updates. Stale saves return HTTP 409 Conflict and trigger an explicit recovery modal (copy draft, reload server version, or overwrite).
4. **Role-Based Sharing & Access Control (RBAC)**: Strict owner-only delegation and title renaming. Non-owners cannot rename (403), grant shares (403), revoke shares (403), or delete documents (403).
5. **Distinct Document Organization**: Dashboard cleanly segregates "My documents" from "Shared with me", displaying collaborator badges and role chips.
6. **File Import (Deliberate Scope: UTF-8 .txt Only)**: Real multipart upload accepting UTF-8 `.txt` files up to 1 MiB. Converts paragraphs into validated editor JSON AST without interpreting tags or scripts. Rejects binary content, zero-byte files, and unsupported formats.
7. **Seeded Demo Accounts**: Pre-seeded with 3 demo personas and an instant session switcher issuing real cryptographic `HttpOnly` sessions (tokens hashed at rest with SHA-256).

---

## 👥 Demo Personas (Instant Session Switcher)

| Demo Account | Email | Role in Demo | Initial Seed Data |
|--------------|-------|--------------|-------------------|
| **Alice Smith** | `alice@draftspace.dev` | **Document Owner** | Owns *Welcome to DraftSpace* and *Private Strategy Notes*. |
| **Bob Jones** | `bob@draftspace.dev` | **Shared Editor** | Shared on *Welcome to DraftSpace*, owns *Sprint Planning Notes*. |
| **Charlie Brown** | `charlie@draftspace.dev` | **Unshared User** | Independent user. Private documents of Alice and Bob are strictly inaccessible (403). |

Use the demo account dropdown in the top-right navbar to switch between accounts instantly!

---

## 📁 File Import: Deliberate Scope

> [!IMPORTANT]
> **DraftSpace deliberately supports UTF-8 `.txt` import only.**
> Markdown (`.md`) and Word (`.docx`) imports are **not supported and not claimed**.

### Import Requirements & Security Safeguards:
1. **Multipart Upload**: Transmitted as real multipart form-data via Multer memory storage (no permanent temp files left on disk).
2. **1 MiB Limit**: Configured at both transport (Multer `1024 * 1024` bytes) and application controller levels. Oversized files receive HTTP 400 (`FILE_TOO_LARGE`).
3. **Case-Insensitive Extension**: Validates `.txt` extension case-insensitively (e.g. `document.txt` and `NOTES.TXT` are accepted; `.md`, `.docx`, `.pdf`, `.html` are rejected with HTTP 400 `UNSUPPORTED_FILE_TYPE`).
4. **MIME Independence**: Does not rely on browser-supplied MIME types; validates extension and buffer bytes directly.
5. **Zero-Byte File Handling**: Empty files (0 bytes) are rejected with HTTP 400 (`EMPTY_FILE`).
6. **Binary Content Rejection**: Rejects files containing null bytes (`0x00`) with HTTP 400 (`BINARY_FILE_REJECTED`).
7. **Strict UTF-8 & BOM Handling**: Validates UTF-8 byte sequences with `TextDecoder('utf-8', { fatal: true })`. Automatically strips optional UTF-8 BOM (`\uFEFF`) if present.
8. **Pure Plain Text (No HTML/Script Injection)**: Raw content is treated purely as plain text paragraphs; never parsed or executed as HTML, scripts, or markdown tokens.
9. **Safe Title Derivation**: Title is derived from the filename (trimmed, 1–120 characters, with fallback to `"Imported Document"`).
10. **File Input Reset**: The file input resets after selection so the exact same file can be selected again for retry.

---

## 🔐 Sharing & Access Control Verification Flow

DraftSpace implements strict server-side RBAC and request-time authorization:

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Alice Smith (Owner)
    actor Bob as Bob Jones (Editor)
    actor Charlie as Charlie Brown (Unshared)
    participant API as DraftSpace Server
    participant DB as Database (Prisma)

    Alice->>API: POST /api/documents (Create "Project Roadmap")
    API->>DB: Insert Document (ownerId: Alice, version: 1)
    Alice->>API: POST /api/documents/:id/shares (userId: Bob)
    API->>DB: Insert DocumentShare (documentId, userId: Bob)
    
    Bob->>API: GET /api/documents
    API-->>Bob: Returns "Project Roadmap" in "Shared with me"
    Bob->>API: PATCH /api/documents/:id (Edit content)
    API-->>Bob: 200 OK (version incremented to 2)

    Charlie->>API: GET /api/documents/:id (Direct URL/API access)
    API-->>Charlie: 403 Forbidden (Blocked)
    Charlie->>API: PATCH /api/documents/:id (Direct write attempt)
    API-->>Charlie: 403 Forbidden (Blocked)

    Bob->>API: PATCH /api/documents/:id (Rename title)
    API-->>Bob: 403 Forbidden (FORBIDDEN_RENAME: Owner only)
    Bob->>API: POST /api/documents/:id/shares (Grant access)
    API-->>Bob: 403 Forbidden (Owner only)

    Alice->>API: DELETE /api/documents/:id/shares/Bob (Revoke Bob)
    API->>DB: Delete DocumentShare
    API-->>Alice: 200 OK (Revoked)

    Bob->>API: PATCH /api/documents/:id (Next save attempt)
    API-->>Bob: 403 Forbidden (Access Revoked)
    Note over Bob: Autosave stopped; local draft preserved in RevokedAccessModal

    Alice->>API: GET /api/documents/:id
    API-->>Alice: 200 OK (Alice retains full owner access)
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js**: v18+ (tested on Node v22.14.0)
- **npm**: v9+ (tested on npm 11.6.2)

### 1. Install Dependencies
```bash
# From workspace root
npm install
```

### 2. Setup Database & Seed Initial Data
DraftSpace supports **PostgreSQL** (for production cloud deployments) and **SQLite** (for zero-dependency instant local execution and testing):
```bash
npm run db:setup
```
*This command runs Prisma generation, pushes the schema, and seeds demo users (Alice, Bob, Charlie) with sample documents.*

### 3. Run Development Servers
```bash
npm run dev
```
- **Frontend Client**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`

---

## 🧪 Automated Testing

All 38 integration tests pass in ~3.2 seconds:

```bash
# Run automated test suite
npm test
```

### Test Coverage Breakdown (38 Tests):
1. **Demo Identity & Sessions (4 tests)**: Health check, demo user listing, HttpOnly session cookie, SHA-256 token hashing at rest.
2. **Document Creation & Versioning (4 tests)**: Document creation, initial version = 1, valid JSON AST storage, title trimming and length limits.
3. **Title Rename Authorization & Concurrency (4 tests)**: Owner rename, 403 FORBIDDEN_RENAME on non-owner rename, atomic rejection on mixed title+content updates.
4. **Optimistic Concurrency Control (OCC) (3 tests)**: 409 Conflict on stale version save, server data preservation, concurrency resolution on updated version.
5. **Sharing Management & Complete End-to-End Flow (10 tests)**:
   - Alice creates document.
   - Alice shares with Bob.
   - Bob sees it under "Shared with me" and edits content.
   - Charlie blocked from read and write (403 Forbidden).
   - Bob blocked from renaming title (403 FORBIDDEN_RENAME).
   - Bob blocked from granting or revoking shares (403 Forbidden).
   - Alice revokes Bob.
   - Bob's subsequent read and write fail with 403 Forbidden.
   - Alice retains full owner access.
   - Self-sharing rejected (400), unknown user rejected (404).
6. **File Import (.txt Only, <= 1 MiB) (8 tests)**:
   - Plain text UTF-8 `.txt` import with paragraph conversion (treating content as text, never HTML or markdown tags).
   - Optional UTF-8 BOM acceptance.
   - Case-insensitive `.txt` (e.g. `.TXT`).
   - Rejection of unsupported extensions (`.md`, `.docx`, `.pdf`, `.html`) with 400 `UNSUPPORTED_FILE_TYPE`.
   - Rejection of zero-byte file (0 bytes) with 400 `EMPTY_FILE`.
   - Rejection of binary content containing null bytes with 400 `BINARY_FILE_REJECTED`.
   - Rejection of malformed UTF-8 with 400 `MALFORMED_UTF8`.
   - Rejection of oversized file (> 1 MiB) with 400 `FILE_TOO_LARGE`.
7. **Document Isolation & Deletion (5 tests)**:
   - Private unshared documents hidden from list queries.
   - Non-owner delete blocked (403).
   - Owner delete succeeds and cascades shares.

---

## 🛠️ Monorepo Scripts Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Runs both server (`:4000`) and client (`:5173`) concurrently |
| `npm run build` | Compiles TypeScript and bundles production assets for both client and server |
| `npm test` | Runs automated Vitest/Supertest test suite (38 tests) |
| `npm run db:setup` | Initializes database schema and seeds demo users |
| `npm run db:seed` | Re-seeds database with starter documents and personas |
