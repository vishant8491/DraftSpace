# DraftSpace — Deployment & Operations Guide

## Architecture Overview

DraftSpace is architected for **zero-friction single-origin deployment**:
- **Unified Public Origin:** The Express backend (`server`) serves both the REST API under `/api/*` and the static, pre-compiled React single-page application from `client/dist`.
- **Elimination of Cross-Origin Complexity:** Because frontend and backend share the same origin in production, `SameSite=Lax` HttpOnly session cookies are transmitted automatically without third-party cookie restrictions, Safari/Chrome ITP blocking, or complex CORS proxy configurations.
- **SPA Fallback Routing:** All non-API GET requests (such as document deep-links `/?doc=<id>`) serve `index.html`. Missing static asset requests (e.g. `*.js`, `*.css`) return HTTP 404 rather than falling back to HTML, preventing script syntax errors.
- **Persistent PostgreSQL Storage:** Production storage runs on PostgreSQL via Prisma ORM (`server/prisma/schema.prisma`). All database tables, indexes, and unique constraints are established during deployment via `npm run db:setup` or `npx prisma db push`.
- **Idempotent Seeding:** Demo users (Alice, Bob, Charlie) and starter documents are seeded idempotently without resetting existing user documents, edits, or versions on restart or redeployment.

---

## Required Environment Variables

All secrets are maintained strictly server-side. No database URLs or secrets are ever exposed to the client bundle or `VITE_` variables.

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | **Yes** | `production` | Enables production optimizations, secure cookies, and static client serving. |
| `PORT` | **Yes** (provided by host) | `4000` (or host-assigned like `10000` on Render) | The network port the Express HTTP server binds to. |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@host:5432/draftspace?schema=public` | Connection string to persistent PostgreSQL instance. |
| `CORS_ORIGIN` | Optional | Host domain (e.g. `https://draftspace.onrender.com`) | Trusted origin for cross-origin requests. In same-origin mode, requests are automatically trusted via the host header. |

---

## Deployment Options

### Option 1: Render (Recommended Blueprint — Free Tier Compatible)

Render offers free Node.js web services and PostgreSQL instances with zero upfront cost.

1. **Push Code to GitHub / GitLab:**
   Ensure the repository containing `render.yaml` is pushed to your Git provider.
2. **Open Render Dashboard:**
   Go to [render.com](https://render.com) and click **New > Blueprint**.
3. **Select Repository:**
   Connect your DraftSpace repository. Render automatically reads `render.yaml`.
4. **Deploy Blueprint:**
   Render provisions:
   - `draftspace-db`: Managed PostgreSQL database.
   - `draftspace-web`: Node.js web service running `npm install && npm run build && npm run db:setup` followed by `npm start`.
5. **Access Live Application:**
   Once the build completes, the application is live at `https://draftspace-web.onrender.com`.

---

### Option 2: Railway

1. Install Railway CLI or connect your Git repository at [railway.app](https://railway.app).
2. Add a **PostgreSQL** database service from the Railway dashboard.
3. Link the web service to the repository.
4. In web service variables, reference `DATABASE_URL = ${{Postgres.DATABASE_URL}}` and set `NODE_ENV = production`.
5. Railway uses `railway.toml` to build client/server, run `node server/scripts/db-setup.js`, and launch via `npm start`.

---

### Option 3: Docker & Docker Compose (Zero Configuration Local / VM Deployment)

A complete production stack with persistent PostgreSQL storage is included in `docker-compose.yml`:

```bash
# Build production image and launch PostgreSQL + DraftSpace stack
docker compose up -d --build

# View container logs
docker compose logs -f app
```

- Web application runs at: `http://localhost:4000`
- PostgreSQL data is persisted across container restarts in the named volume `postgres_data`.

---

### Option 4: Self-Hosted Linux / VPS (Ubuntu / Debian)

```bash
# 1. Clone repository and install dependencies
git clone <repo-url> draftspace && cd draftspace
npm install

# 2. Build server and client production bundles
npm run build

# 3. Configure environment variables (.env in server/)
cat <<EOF > server/.env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://draftspace_user:password@localhost:5432/draftspace?schema=public
EOF

# 4. Run database migrations and idempotent seed
node server/scripts/db-setup.js

# 5. Start with process manager (e.g. PM2 or systemd)
npm start
# or: pm2 start npm --name "draftspace" -- start
```

---

## Verification & Reviewer Testing Guide

Reviewers can test all functionality immediately without creating external accounts or paying fees:

1. **Open Live App URL:**
   The workspace loads with an active demo account selector (Alice Smith, Bob Jones, Charlie Brown).
2. **Select Alice Smith:**
   Create a document, test rich text formatting (Heading 1, Bold, Italic, Underline, Bullet list, Numbered list).
3. **Inspect Save Status:**
   Status changes from `Unsaved changes` &rarr; `Saving...` &rarr; `Saved`.
4. **Reload Document URL:**
   Refresh the page with `?doc=<id>` in the address bar. The document, title, and formatting reload instantly.
5. **File Import:**
   Click **Import .txt** on the dashboard. Select any valid UTF-8 `.txt` file (<= 1 MiB). The file imports as an editable document.
6. **Collaboration & Sharing:**
   Click **Share** as Alice and grant access to **Bob Jones**. Switch demo account to Bob: the document appears under **Shared with me**. Bob can edit content, but cannot rename or manage sharing.
7. **Access Revocation:**
   Switch back to Alice, open the document share modal, and revoke Bob's access. Bob can no longer read or update the document.
