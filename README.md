# DraftSpace 📝

> A lightweight, modern shared document editor inspired by Google Docs, built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **Tiptap**, **Node.js**, **Express**, and **Prisma ORM**.

[![Tests](https://img.shields.io/badge/tests-16%20passed-emerald)](file:///c:/documentsOfMine/DraftScape/server/src/tests/api.test.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](file:///c:/documentsOfMine/DraftScape/tsconfig.json)
[![License](https://img.shields.io/badge/License-MIT-slate)](LICENSE)

---

## 🌟 Overview & Highlights

DraftSpace delivers a focused vertical slice of a collaborative document suite:
1. **Rich-Text Editing in the Browser**: Powered by Tiptap with full formatting (Bold, Italic, Underline, Headings H1/H2/H3, Bulleted & Numbered lists, Blockquotes, Code blocks, and text alignment).
2. **Persistent Cloud Storage & Auto-Save**: Seamless debounced auto-save (1.2s debounce) with real-time feedback pills ("Saved to cloud", "Saving...", "Unsaved changes") + manual `Ctrl+S` shortcut.
3. **Role-Based Sharing & Access Control**: Strict ownership model with granular permission delegation (`owner`, `editor`, `viewer`).
4. **Distinct Document Organization**: Dashboard cleanly segregates "My Documents" from "Shared with me", displaying collaborator badges and role chips.
5. **Product-Relevant File Import**: Drag-and-drop or upload UTF-8 `.txt` and `.md` files directly into editable, formatted DraftSpace documents.
6. **Seeded Demo Personas**: Pre-seeded with 3 realistic team members and an instant navbar session switcher for testing permission boundaries without tedious signup flows.

---

## 👥 Demo Personas (Instant Session Switcher)

| Persona | Email | Avatar / Color | Role in Demo |
|---------|-------|----------------|--------------|
| **Alex Rivera** | `alex@draftspace.dev` | Emerald | **Lead Writer & Owner** — Owns *Q4 Product Strategy* and private confidential memos. |
| **Morgan Chen** | `morgan@draftspace.dev` | Indigo | **Editor Collaborator** — Has edit rights on *Q4 Product Strategy*, owns *User Interview Insights*. |
| **Sam Taylor** | `sam@draftspace.dev` | Amber | **Viewer Collaborator** — Has read-only rights on *Q4 Product Strategy*, owns *DevOps Runbook*. Unshared documents are strictly hidden. |

Use the user switcher dropdown in the top-right corner to toggle between personas instantly!

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
*This command runs Prisma generation, pushes the schema, and seeds demo users with sample documents.*

### 3. Run Development Servers
```bash
npm run dev
```
- **Frontend Client**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`

---

## 🧪 Automated Testing

DraftSpace includes a comprehensive automated test suite (16 integration tests) verifying authentication, CRUD operations, permission isolation, viewer restrictions, sharing delegation, and file upload parsing:

```bash
# Run automated test suite
npm test
```

### Test Coverage Highlights:
- ✅ **Health check & Auth**: Token verification and 401 unauthorized rejection.
- ✅ **Document CRUD & Renaming**: Creation with owner role and empty title rejection (400).
- ✅ **Access Control Enforcement**:
  - Owner (Alex) updates content -> `200 OK`.
  - Editor (Morgan) updates content -> `200 OK`.
  - Viewer (Sam) blocked from editing -> `403 Forbidden`.
  - Unshared user (Sam) blocked from viewing private document -> `403 Forbidden`.
  - Collaborator (Morgan) blocked from deleting document -> `403 Forbidden`.
- ✅ **Collaborator Management**: Owner grants access, non-owner rejected, owner revokes access.
- ✅ **File Import**: UTF-8 `.txt` and `.md` parsing into semantic HTML with owner assignment.

---

## 🛠️ Monorepo Scripts Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Runs both server (`:4000`) and client (`:5173`) concurrently |
| `npm run build` | Compiles TypeScript and bundles production assets for both client and server |
| `npm test` | Runs automated Vitest/Supertest test suite |
| `npm run db:setup` | Initializes database schema and seeds demo users |
| `npm run db:seed` | Re-seeds database with starter documents and personas |

---

## 🌐 Environment Variables

See [.env.example](file:///c:/documentsOfMine/DraftScape/.env.example) for defaults:

```env
# Server (.env)
PORT=4000
NODE_ENV=development
DATABASE_URL="file:./dev.db"  # Or postgresql://user:pass@host:5432/draftspace
CORS_ORIGIN="http://localhost:5173"

# Client (.env)
VITE_API_URL="http://localhost:4000/api"
```

---

## ☁️ Production Deployment

### Option A: Unified Container (Render / Railway / Fly.io / Docker)
The Express server is configured to serve the compiled client from `client/dist` directly for non-API routes:
1. Build client and server: `npm run build`
2. Point `DATABASE_URL` to your PostgreSQL database (e.g. Neon, Supabase, Render Postgres)
3. Run `npm run db:setup`
4. Start server: `npm run start --workspace=server`

### Option B: Decoupled (Vercel Frontend + Render Backend)
- **Frontend**: Deploy `client/` to Vercel or Netlify with environment variable `VITE_API_URL="https://your-api.onrender.com/api"`.
- **Backend**: Deploy `server/` to Render with `DATABASE_URL` pointing to PostgreSQL.
