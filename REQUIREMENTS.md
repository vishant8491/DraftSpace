# DraftSpace — Requirements & Feature Traceability

DraftSpace is a lightweight shared document editor inspired by Google Docs, built as an end-to-end full-stack web application.

---

## 1. Requirement-to-Feature Checklist

| # | Requirement | Implementation Feature | Verification / Acceptance Criteria | Status |
|---|-------------|------------------------|-----------------------------------|--------|
| **1** | **Create and rename documents** | • "New Document" button<br>• Inline editable document title in header<br>• Real-time title rename with validation | Title updates on blur / Enter; non-empty title validation; persistent in DB. | ⏳ In Progress |
| **2** | **Edit document content in browser** | • Rich-text editing area powered by Tiptap<br>• Full browser editing with comfortable writing layout | Fast, responsive typing; cursor tracking; zero visual flicker. | ⏳ In Progress |
| **3** | **Formatting & Typography** | • Bold (`ctrl+b`)<br>• Italic (`ctrl+i`)<br>• Underline (`ctrl+u`)<br>• Headings (H1, H2, H3, Paragraph)<br>• Bulleted list (`ul`) & Numbered list (`ol`) | Active toolbar state reflects current selection; keyboard shortcuts work; HTML formatting rendered accurately. | ⏳ In Progress |
| **4** | **Save & Reopen with formatting preserved** | • Auto-save debounced indicator ("Saved", "Saving...", "Unsaved changes")<br>• Explicit "Save" button<br>• Complete document reload | Reloading page preserves all formatting (headings, lists, bold, italics, underlines). | ⏳ In Progress |
| **5** | **Product-relevant file upload** | • Import UTF-8 `.txt` and `.md` files as new documents<br>• Insert file text into active document<br>• File size & MIME validation | Drag-and-drop or file picker; creates new editable document with title derived from filename; prevents oversized/invalid files. | ⏳ In Progress |
| **6** | **Document ownership** | • `ownerId` associated with creating user<br>• Ownership badge ("Owner") in dashboard and editor | User who created the document is designated owner; only owner can delete or manage sharing. | ⏳ In Progress |
| **7** | **Owner can grant access** | • "Share" modal with user selector<br>• Role assignment: `editor` (can edit) or `viewer` (read-only)<br>• Revoke access capability | Owner can add/remove collaborators; backend rejects sharing attempts by non-owners with 403 Forbidden. | ⏳ In Progress |
| **8** | **Distinguish owned vs shared docs** | • Dashboard tabs: "My Documents" vs. "Shared with Me"<br>• Clear visual chips: "Owner", "Shared by [User]", "Editor", "Viewer" | Immediately obvious whether current user owns the document or has shared access. | ⏳ In Progress |
| **9** | **Persist in backend database** | • Prisma ORM with relational schema (`User`, `Document`, `DocumentShare`, `Session`)<br>• PostgreSQL support (production) + SQLite fallback (local zero-dependency) | Data persists across server restarts; foreign keys and cascade rules maintained. | ⏳ In Progress |
| **10** | **Validation, errors, setup, test, arch note** | • Zod payload validation<br>• Centralized error handler with standardized JSON<br>• Root scripts (`npm run dev`, `build`, `test`)<br>• Automated tests (access control, CRUD, permissions)<br>• `ARCHITECTURE.md` | Automated test suite passes; API returns 400/401/403/404 with helpful messages; setup steps documented. | ⏳ In Progress |
| **11** | **Honest AI workflow note** | • `SUBMISSION.md` and `README.md` documenting AI usage, tool prompts, assisted tasks, human-driven decisions | Full transparency on code generation, architecture decisions, and debugging. | ⏳ In Progress |
| **12** | **Submission materials & 3–5 min walkthrough** | • `SUBMISSION.md` with structured walkthrough outline, demo flow, and presentation script | Clear script guiding evaluator through a 3–5 minute presentation. | ⏳ In Progress |

---

## 2. Core Personas (Seeded Demo Users)

To make evaluation seamless without requiring signup/email verification, DraftSpace includes 3 pre-seeded demo users with an instant session switcher:

1. **Alex Rivera** (`alex@draftspace.dev`) — Primary writer/owner.
2. **Morgan Chen** (`morgan@draftspace.dev`) — Collaborator (editor on some documents, viewer on others).
3. **Sam Taylor** (`sam@draftspace.dev`) — External team member (used to test permissions and unshared document isolation).

---

## 3. Scope Boundaries & Explicit Non-Goals

As specified in the assessment guidelines:
- ❌ **No simultaneous real-time operational transformation / CRDTs**: Normal document sharing with access control, not multi-cursor WebSockets.
- ❌ **No comments or threaded review system**: Focus on document editing and sharing.
- ❌ **No AI text generation**: Focus on core rich-text editor, storage, and access controls.
- ❌ **No complex billing or multi-tenant organizations**: Focus on user-to-user document sharing.
- ❌ **No elaborate OAuth / magic-link flows**: Seeded demo users with server-issued session tokens for friction-free evaluation.
