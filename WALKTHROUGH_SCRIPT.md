# DraftSpace — Walkthrough Video Recording Script (3–5 Minutes)

Use this outline during your screen recording (Loom, OBS, or QuickTime). It follows the exact timing and actual features of the implemented application.

---

### [0:00 – 0:25] Goal, Stack, and Scope
- **Visual**: Start on the DraftSpace dashboard (`http://localhost:5173` or `:4000`) showing the clean header, active demo account badge ("Active Demo: Alice Smith"), and document lists.
- **Spoken**:
  > *"Hello! Today I'm presenting DraftSpace — a lightweight, shared document editor inspired by Google Docs.*
  >
  > *DraftSpace is built as a TypeScript monorepo with React 18, Vite, Tailwind CSS, and Tiptap on the frontend, and Node.js, Express, and Prisma ORM on the backend. It supports persistent storage in PostgreSQL and SQLite.*
  >
  > *For evaluation, the application includes three pre-seeded demo accounts — Alice, Bob, and Charlie — each generating real server-issued HttpOnly sessions with SHA-256 token hashing at rest."*

---

### [0:25 – 1:30] Create, Rename, Format, Save, and Refresh
- **Visual**:
  1. Click **New Document**.
  2. Click the title input in the top navbar. Rename from `Untitled Document` to `Q4 Product Strategy` and press Enter.
  3. In the editor canvas, type a title and apply **Heading 1**.
  4. Type a sentence with **Bold**, **Italic**, and **Underline** formatting using toolbar buttons or keyboard shortcuts (`Ctrl+B`, `Ctrl+I`, `Ctrl+U`).
  5. Add a **Bulleted list** and a **Numbered list**.
  6. Point to the save indicator in the top navbar: watch it change from `Unsaved changes` (amber dot) &rarr; `Saving...` (spinner) &rarr; `Saved` (green check).
  7. Hit browser **Refresh** (`F5` or `Ctrl+R`) on the URL (`?doc=<id>`).
- **Spoken**:
  > *"Let's start as Alice Smith. Clicking 'New Document' creates a fresh document and opens its dedicated URL. Let's rename the title to 'Q4 Product Strategy'.*
  >
  > *In the editor canvas, we have full rich-text capabilities powered by Tiptap and ProseMirror: Headings, Bold, Italic, Underline, Bulleted and Numbered lists, Blockquotes, and Code blocks.*
  >
  > *Notice the save indicator in the header: edits are debounced by 800ms with serialized in-flight request management. The caret position remains stable without cursor jumping.*
  >
  > *When we refresh the browser, the URL with query parameter `?doc=<id>` reloads the document with all rich-text formatting and the incremented version intact."*

---

### [1:30 – 2:00] File Import (.txt Only)
- **Visual**:
  1. Click the back arrow to return to the Dashboard.
  2. Click **Import .txt** button.
  3. Drag and drop or choose a valid `.txt` file (e.g. `notes.txt`).
  4. Point out the clear badge: "UTF-8 Plain Text (.txt) Only — Max 1 MiB".
  5. Click **Import & Open**. The file converts to ProseMirror paragraphs and opens immediately in the editor.
- **Spoken**:
  > *"Next, let's test file import. DraftSpace deliberately supports UTF-8 plain text (.txt) files up to 1 MiB. Markdown and Word documents are explicitly rejected.*
  >
  > *The backend handles this via true multipart upload in memory, checking for binary null bytes, validating fatal UTF-8 decoding, and stripping optional BOMs. Text is safely parsed into ProseMirror paragraphs without executing script tags.*
  >
  > *Clicking 'Import & Open' creates the document in the database and launches it directly in the editor."*

---

### [2:00 – 3:00] Sharing, Multi-User Roles, and Access Enforcement
- **Visual**:
  1. As Alice, open `Q4 Product Strategy` and click the **Share** button in the header.
  2. Select **Bob Jones** from the user dropdown and click **Share**. Bob appears in the collaborator list.
  3. Switch accounts: Open the demo user menu in the top-right header and select **Bob Jones**.
  4. In Bob's dashboard, point to `Q4 Product Strategy` under **Shared with me** with the `Shared Editor` badge and `By Alice Smith`.
  5. Open the document as Bob: edit some text (notice saves succeed).
  6. Hover over the title input: show that it is disabled for Bob, and a tooltip explains that only the owner can rename documents.
  7. Switch account to **Charlie Brown**:
     - Point out that `Q4 Product Strategy` is completely absent from Charlie's dashboard.
     - Paste the document URL into the address bar: the backend returns HTTP 403 Forbidden and the screen displays an Access Denied state.
  8. Switch back to **Alice Smith**: open the Share dialog and click the trash can icon next to Bob Jones to revoke his access.
  9. Switch to **Bob Jones** (with document open) and type: the server rejects the write with 403, and the `RevokedAccessModal` appears, halting autosave while preserving Bob's uncommitted text with a copy button.
- **Spoken**:
  > *"Now let's demonstrate sharing and role-based permissions. As Alice, the document owner, I click 'Share' and grant access to Bob Jones.*
  >
  > *Switching demo accounts to Bob Jones via our header dropdown, the document now appears under 'Shared with me' with creator attribution. As a shared editor, Bob can edit content and his changes are saved.*
  >
  > *However, only the owner can rename documents or manage sharing. Notice the title input is disabled for Bob, and unauthorized API rename requests are rejected with HTTP 403 Forbidden.*
  >
  > *If we switch to Charlie Brown, the document is completely hidden. Attempting direct URL access returns HTTP 403.*
  >
  > *Finally, if Alice revokes Bob's access while he has the document open, his next save attempt is rejected with 403, autosave stops immediately, and a modal preserves his local draft so no work is lost."*

---

### [3:00 – 3:40] Architecture, Persistence, Tests, and Conflict Handling
- **Visual**:
  1. Open terminal and run `npm test`.
  2. Show all 47 tests passing across the 8 test suites in ~2.6 seconds.
  3. Briefly explain the integer versioning and 409 conflict handling.
- **Spoken**:
  > *"Under the hood, DraftSpace uses Prisma ORM with relational models for Users, Documents, DocumentShares, and Sessions. Tokens are stored hashed with SHA-256 at rest.*
  >
  > *To handle concurrency, we use database-level Optimistic Concurrency Control (OCC) with an integer version field. If two sessions edit concurrently and a stale version is submitted, the server rejects the write with HTTP 409 Conflict rather than silently overwriting.*
  >
  > *In the terminal, running `npm test` executes our full suite of 47 automated integration tests in 2.6 seconds, verifying identity resolution, RBAC rules, OCC conflicts, sharing revocation, and file security."*

---

### [3:40 – 4:30] AI Workflow, Deliberate Scope Cuts, and Limitations
- **Visual**:
  1. Return to the clean browser window showing the working DraftSpace app.
  2. Highlight the `render.yaml`, `Dockerfile`, and `docker-compose.yml` configuration files in the editor.
- **Spoken**:
  > *"During development, AI assisted with initial workspace scaffolding, Prisma schemas, and comprehensive Supertest test generation.*
  >
  > *Several human engineering decisions guided the architecture: we rejected fragile WebSocket sockets in favor of robust OCC versioning with conflict recovery; we scoped file import strictly to plain text to eliminate conversion edge cases; and we updated our seed logic so restarts never wipe out existing documents.*
  >
  > *The application is production-ready for deployment as a unified single-origin service on Render or Docker. Thank you!"*
