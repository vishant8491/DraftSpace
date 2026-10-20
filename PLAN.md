# DraftSpace — Implementation, QA, Deployment & Submission Plan

## 1. Executive Summary & Assessment Scope
- **Total Time Budget**: 240 minutes.
- **Goal**: Deliver a production-grade vertical slice of DraftSpace: a lightweight shared document editor with rich-text capabilities, ownership, sharing permissions, product-relevant file upload (.txt import), persistent storage, automated testing, and comprehensive documentation.

---

## 2. System Architecture & Data Model

### Monorepo Structure
```
DraftScape/
├── package.json              # Root workspace management (concurrently/workspaces)
├── .gitignore
├── .env.example
├── README.md                 # Complete local setup & project overview
├── REQUIREMENTS.md           # Requirement-to-feature checklist
├── PLAN.md                   # Implementation & technical plan
├── ARCHITECTURE.md           # System design & architecture note
├── SUBMISSION.md             # Walkthrough script & AI workflow note
├── client/                   # React 18 + Vite + TypeScript + Tailwind CSS
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── api/              # Strongly typed API client
│       ├── components/       # DocumentList, EditorToolbar, TiptapEditor, ShareModal, UserSwitcher
│       ├── context/          # AuthContext (session-aware demo user management)
│       ├── types/            # Shared frontend TypeScript interfaces
│       └── App.tsx           # Router / Screen switcher (Dashboard vs. Editor)
└── server/                   # Node.js + Express + TypeScript + Prisma
    ├── prisma/
    │   ├── schema.prisma     # Relational schema (PostgreSQL default + SQLite local dev)
    │   └── seed.ts           # Demo users and seed documents
    └── src/
        ├── index.ts          # Server entrypoint
        ├── app.ts            # Express application setup
        ├── routes/           # /api/auth, /api/documents, /api/upload
        ├── controllers/      # DocumentController, AuthController, UploadController
        ├── middleware/       # authMiddleware, errorHandler, validate
        └── tests/            # Automated integration & unit tests
```

### Relational Data Model (Prisma)
- **User**
  - `id`: String (UUID or CUID, Primary Key)
  - `email`: String (Unique)
  - `name`: String
  - `avatar`: String?
  - `createdAt`: DateTime
  - `updatedAt`: DateTime
  - *Relations*: `ownedDocuments` (Document[]), `sharedDocuments` (DocumentShare[])
- **Document**
  - `id`: String (UUID or CUID, Primary Key)
  - `title`: String (Default: "Untitled Document")
  - `content`: String (HTML string or JSON string from Tiptap)
  - `ownerId`: String (Foreign Key -> User.id)
  - `createdAt`: DateTime
  - `updatedAt`: DateTime
  - *Relations*: `owner` (User), `shares` (DocumentShare[])
- **DocumentShare**
  - `id`: String (Primary Key)
  - `documentId`: String (Foreign Key -> Document.id, Cascade on delete)
  - `userId`: String (Foreign Key -> User.id, Cascade on delete)
  - `role`: String ("editor" | "viewer")
  - `createdAt`: DateTime
  - `updatedAt`: DateTime
  - *Unique Constraint*: `[documentId, userId]`
- **Session**
  - `id`: String (Primary Key)
  - `userId`: String (Foreign Key -> User.id)
  - `token`: String (Unique session token)
  - `expiresAt`: DateTime

---

## 3. API Contract Specification

All endpoints return JSON responses. Errors return `{ "error": "Descriptive message", "code": "ERROR_CODE" }`.

### Authentication & Users
- `GET /api/auth/users`: List seeded demo users (for user switcher and share picker).
- `GET /api/auth/me`: Get current authenticated user based on session token.
- `POST /api/auth/login`: Switch or login as demo user (`{ "userId": string }`) -> returns `{ "token": string, "user": User }`.

### Documents
- `GET /api/documents`: List documents accessible to current user.
  - Returns `{ "owned": Document[], "shared": (Document & { role: "editor" | "viewer" })[] }`.
- `POST /api/documents`: Create a new blank document (`{ "title"?: string, "content"?: string }`).
- `GET /api/documents/:id`: Fetch document details + user's permission (`{ document: Document, role: "owner" | "editor" | "viewer" }`). Returns 403 if user has no access, 404 if not found.
- `PUT /api/documents/:id`: Update document title or content (`{ "title"?: string, "content"?: string }`). Allowed only for `owner` and `editor`. Viewers receive 403.
- `DELETE /api/documents/:id`: Delete document. Allowed only for `owner`. Collaborators receive 403.

### Sharing & Permissions
- `GET /api/documents/:id/shares`: Get list of active shares for this document. (Owner only).
- `POST /api/documents/:id/shares`: Add or update a share (`{ "userId": string, "role": "editor" | "viewer" }`). (Owner only).
- `DELETE /api/documents/:id/shares/:userId`: Revoke user access. (Owner only).

### File Import / Upload
- `POST /api/upload/import`: Multipart form-data with UTF-8 `.txt` or `.md` file.
  - Reads content, validates size (max 2MB) and type.
  - Automatically creates a new document with title extracted from filename (without extension) and body formatted with proper paragraphs.
  - Returns `{ "document": Document }`.

---

## 4. Deployment Dependencies & Environment Variables

### Early Identification of Environment Variables
```env
# Server (.env)
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/draftspace?schema=public"
# Local fallback (zero-dependency SQLite option for instant testing/eval):
# DATABASE_URL="file:./dev.db"
CORS_ORIGIN="http://localhost:5173"

# Client (.env)
VITE_API_URL="http://localhost:4000/api"
```

### Deployment Strategy
- **Backend**: Render / Railway / Fly.io / Node host with PostgreSQL database (Neon / Supabase / Render Postgres).
- **Frontend**: Vercel / Netlify / Render Static Site, configured with `VITE_API_URL`.
- **Database**: PostgreSQL with Prisma migrations (`prisma migrate deploy` or `prisma db push`).

---

## 5. Deliberate Scope Cuts & Assumptions
1. **No Operational Transformation / Multi-cursor WebSockets**: The prompt explicitly specifies single-editor document access with clear permissions, not simultaneous real-time multi-user editing.
2. **Simplified Authentication via Seeded Personas**: Rather than email verification or password reset flows, DraftSpace uses seeded demo accounts with authentic server-issued bearer tokens, enabling assessors to switch roles instantly.
3. **Format Support**: Rich text handles Bold, Italic, Underline, Headings (H1, H2, H3), Bulleted lists, Numbered lists, and paragraphs.
4. **Product-Relevant Upload**: Import of `.txt` and `.md` files directly into editable documents, which fits a document editor workflow.

---

## 6. Implementation Phases

- **Phase 1: Foundation & Scaffolding**
  - Setup monorepo `package.json`, TypeScript configs, ESLint/Prettier, Tailwind CSS.
  - Install dependencies (Express, Prisma, Tiptap, Lucide icons, etc.).
- **Phase 2: Database & Backend API**
  - Configure Prisma schema with dual capability (PostgreSQL for deployment + zero-friction local fallback).
  - Implement seed script with 3 demo users and starter documents.
  - Implement controllers, validation middleware, route handlers, and error handler.
- **Phase 3: Frontend Application & Rich Text Editor**
  - Setup UI design system with Tailwind CSS (Google Docs inspired, clean, modern, responsive).
  - Tiptap rich-text editor with complete toolbar (bold, italic, underline, headings, lists).
  - Document dashboard with clear separation of "My Documents" vs. "Shared with Me".
  - Share modal with permission controls and collaborator list.
  - File upload modal & drag-and-drop import.
  - Demo user switcher in navbar for testing permission states.
- **Phase 4: Automated Testing & Quality Assurance**
  - Supertest + Vitest/Jest for backend API tests:
    - Document creation & rename.
    - Owner permissions vs. non-owner 403 access.
    - Editor can edit, Viewer is blocked from editing.
    - File upload validation.
- **Phase 5: Documentation & Submission**
  - `README.md` with step-by-step setup and test commands.
  - `ARCHITECTURE.md` with deep-dive into design decisions.
  - `SUBMISSION.md` with video walkthrough script and honest AI workflow note.
