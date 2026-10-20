# DraftSpace — Requirements & Feature Traceability

DraftSpace is a lightweight shared document editor inspired by Google Docs, built with persistent backend storage, optimistic concurrency control, and strict role-based access control.

---

## 1. Requirement-to-Feature Checklist

| # | Requirement | Implementation Feature | Verification & Acceptance Evidence | Status |
|---|-------------|------------------------|------------------------------------|:------:|
| **1** | **Create and rename documents** | • `POST /api/documents`<br>• `PATCH /api/documents/:id` with owner check<br>• Trimmed titles, 1–120 characters | `POST` creates doc; `PATCH` renames; empty or >120 char rejected (400); shared editors attempting rename rejected with 403. | ✅ Verified (Tests 7, 8, 17) |
| **2** | **Edit document content in browser** | • Tiptap rich-text editor with Google Docs layout<br>• Stored as validated editor JSON | Tiptap JSON `{ type: "doc", content: [...] }` validated against allowed nodes/marks; unsupported node types rejected with 400. | ✅ Verified (Tests 10, 11) |
| **3** | **Formatting & Typography** | • Bold, Italic, Underline, Headings (H1/H2/H3), Bulleted lists, Numbered lists, Quotes, Code blocks | Supported node and mark schemas enforced both on frontend and in backend schema validator (`editorValidator.ts`). | ✅ Verified (Test 11) |
| **4** | **Save & Reopen with formatting preserved** | • Debounced auto-save (1.2s) + manual `Ctrl+S`<br>• Atomic optimistic concurrency versioning (`v1` → `v2`) | Update increments version; reloading page preserves full JSON document; stale version returns 409 Conflict without overwriting. | ✅ Verified (Tests 12, 13, 14) |
| **5** | **Product-relevant file upload** | • `POST /api/documents/import`<br>• Imports UTF-8 `.txt` and `.md` files into valid editor JSON | Converts headers and lists into ProseMirror AST nodes; owner set to active user; initial version set to 1. | ✅ Verified (Test 27) |
| **6** | **Document ownership** | • `Document.ownerId` referencing `User.id`<br>• Owner badge in dashboard and editor header | Owner resolved strictly from server-issued session; spoofed `ownerId` in request bodies strictly ignored. | ✅ Verified (Tests 9, 15) |
| **7** | **Owner can grant & revoke access** | • `POST /api/documents/:id/shares`<br>• `DELETE /api/documents/:id/shares/:userId`<br>• Safe idempotent grants via `upsert` | Only owner can share/revoke; non-owner receives 403; self-share rejected with 400; unknown user rejected with 404. | ✅ Verified (Tests 21–26) |
| **8** | **Distinguish owned vs shared docs** | • Dashboard tabs: "My Documents" vs. "Shared with me"<br>• Clear visual chips: "Owner", "Shared Editor", version badges | `GET /api/documents` strictly returns owned docs and shared docs; unshared private docs never leak in list responses. | ✅ Verified (Test 20) |
| **9** | **Persist in backend database** | • Prisma ORM with relational schema (`User`, `Document`, `DocumentShare`, `Session`)<br>• PostgreSQL (production) + SQLite (zero-setup dev/test) | Changes persist across restarts; idempotent seed script never wipes database unexpectedly. | ✅ Verified (All 27 tests pass idempotently) |
| **10** | **Validation, errors, setup, test, arch note** | • Zod request validation, centralized error handler<br>• 27 automated integration tests passing (`npm test`)<br>• Comprehensive `ARCHITECTURE.md` | All 27 tests passing; standardized error responses `{ error, code }`; no credential or stack trace leaks. | ✅ Verified |
| **11** | **Honest AI workflow note** | • Documented AI prompt strategy, human architecture decisions, and code validation | Documented in `SUBMISSION.md` and `README.md`. | ✅ Verified |
| **12** | **Submission materials & 3–5 min walkthrough** | • `SUBMISSION.md` with structured walkthrough outline, demo flow, and presentation script | Clear script guiding evaluator through a 3–5 minute presentation. | ✅ Verified |

---

## 2. Demo Identity Personas

Seeded with 3 realistic accounts with server-issued HttpOnly session cookies:

1. **Alice Smith** (`alice@draftspace.dev`) — Owner of starter specification and confidential memo.
2. **Bob Jones** (`bob@draftspace.dev`) — Shared editor on Alice's specification, owner of research notes.
3. **Charlie Brown** (`charlie@draftspace.dev`) — Unshared team member, cannot read or list Alice's private documents.

---

## 3. Strict Access Control Matrix

| Action | Owner | Shared Editor | Unshared User |
|--------|:-----:|:-------------:|:-------------:|
| **Read Document** | ✅ Yes | ✅ Yes | ❌ 403 Forbidden |
| **Edit Content** | ✅ Yes | ✅ Yes (atomic version check) | ❌ 403 Forbidden |
| **Rename Title** | ✅ Yes | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **List Shares** | ✅ Yes | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Grant Access** | ✅ Yes | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Revoke Access** | ✅ Yes | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Delete Document** | ✅ Yes | ❌ 403 Forbidden | ❌ 403 Forbidden |
