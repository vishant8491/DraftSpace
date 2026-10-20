import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../prisma.js';
import { seed } from '../../prisma/seed.js';

let aliceCookie: string;
let aliceToken: string;
let bobCookie: string;
let bobToken: string;
let charlieCookie: string;
let charlieToken: string;

const SAMPLE_VALID_DOC_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Concurrent Editing Specification' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'This content is stored as ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'validated editor JSON' },
        { type: 'text', text: '.' },
      ],
    },
  ],
};

beforeAll(async () => {
  // Ensure idempotent database seed
  await seed();

  // Create demo session for Alice
  const aliceRes = await request(app)
    .post('/api/demo-session')
    .send({ userId: 'user_alice' });
  aliceToken = aliceRes.body.sessionToken;
  aliceCookie = aliceRes.headers['set-cookie']?.[0]?.split(';')[0] || '';

  // Create demo session for Bob
  const bobRes = await request(app)
    .post('/api/demo-session')
    .send({ userId: 'user_bob' });
  bobToken = bobRes.body.sessionToken;
  bobCookie = bobRes.headers['set-cookie']?.[0]?.split(';')[0] || '';

  // Create demo session for Charlie
  const charlieRes = await request(app)
    .post('/api/demo-session')
    .send({ userId: 'user_charlie' });
  charlieToken = charlieRes.body.sessionToken;
  charlieCookie = charlieRes.headers['set-cookie']?.[0]?.split(';')[0] || '';
});

describe('1. Demo Identity & Session Management', () => {
  it('GET /api/health should return ok and database status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBeDefined();
  });

  it('GET /api/demo-users returns Alice, Bob, and Charlie', async () => {
    const res = await request(app).get('/api/demo-users');
    expect(res.status).toBe(200);
    expect(res.body.notice).toContain('Mocked demo authentication');
    expect(Array.isArray(res.body.users)).toBe(true);
    const names = res.body.users.map((u: any) => u.displayName);
    expect(names).toContain('Alice Smith');
    expect(names).toContain('Bob Jones');
    expect(names).toContain('Charlie Brown');
  });

  it('POST /api/demo-session sets HttpOnly session cookie and stores token hashed at rest', async () => {
    const res = await request(app)
      .post('/api/demo-session')
      .send({ userId: 'user_alice' });

    expect(res.status).toBe(201);
    expect(res.body.user.displayName).toBe('Alice Smith');
    expect(res.body.sessionToken).toBeDefined();

    // Verify Set-Cookie header contains HttpOnly and SameSite
    const setCookie = res.headers['set-cookie']?.[0];
    expect(setCookie).toContain('draftspace_session');
    expect(setCookie?.toLowerCase()).toContain('httponly');
    expect(setCookie?.toLowerCase()).toContain('samesite=lax');

    // Verify token is hashed at rest in database
    const sessions = await prisma.session.findMany({ where: { userId: 'user_alice' } });
    expect(sessions.length).toBeGreaterThan(0);
    // Token in DB must NOT match raw token string
    expect(sessions[0].tokenHash).not.toBe(res.body.sessionToken);
    expect(sessions[0].tokenHash.length).toBe(64); // SHA-256 hex length
  });

  it('GET /api/me resolves identity from session cookie or Bearer token', async () => {
    // Via Cookie
    const cookieRes = await request(app)
      .get('/api/me')
      .set('Cookie', aliceCookie);
    expect(cookieRes.status).toBe(200);
    expect(cookieRes.body.user.displayName).toBe('Alice Smith');

    // Via Bearer Header
    const bearerRes = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(bearerRes.status).toBe(200);
    expect(bearerRes.body.user.email).toBe('alice@draftspace.dev');
  });

  it('Protected request without session returns 401', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('DELETE /api/session logs out, revokes session, and clears cookie', async () => {
    // Create temporary session to revoke
    const tempRes = await request(app)
      .post('/api/demo-session')
      .send({ userId: 'user_charlie' });
    const tempToken = tempRes.body.sessionToken;

    const logoutRes = await request(app)
      .delete('/api/session')
      .set('Authorization', `Bearer ${tempToken}`);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toContain('Logged out successfully');

    // Subsequent request with revoked token must fail with 401
    const checkRes = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${tempToken}`);
    expect(checkRes.status).toBe(401);
  });
});

describe('2. Validation & Security Enforcement', () => {
  it('POST /api/documents trims titles and enforces 1-120 char length', async () => {
    // Empty title
    const emptyRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: '    ' });
    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.code).toBe('INVALID_TITLE_LENGTH');

    // Overly long title (>120 chars)
    const longTitle = 'A'.repeat(125);
    const longRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: longTitle });
    expect(longRes.status).toBe(400);
    expect(longRes.body.code).toBe('INVALID_TITLE_LENGTH');

    // Valid title with padding whitespace
    const validRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: '   Sprint Goals 2026   ' });
    expect(validRes.status).toBe(201);
    expect(validRes.body.document.title).toBe('Sprint Goals 2026');
    expect(validRes.body.version).toBe(1);
  });

  it('Ignores spoofed ownerId or acting userId in request body', async () => {
    // Alice creates doc but tries to pass ownerId: "user_bob"
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        title: 'Security Verification Doc',
        ownerId: 'user_bob',
        userId: 'user_bob',
        role: 'admin',
      });

    expect(res.status).toBe(201);
    // Identity must strictly remain Alice
    expect(res.body.document.ownerId).toBe('user_alice');
  });

  it('Validates rich-text editor JSON and rejects unsupported node types', async () => {
    // Malformed JSON string
    const malformedRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        title: 'Malformed Test',
        content: '{ invalidJson: true,',
      });
    expect(malformedRes.status).toBe(400);
    expect(malformedRes.body.error).toContain('valid JSON');

    // Unsupported node type (e.g. script / iframe)
    const unsupportedRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        title: 'XSS Attempt Test',
        content: {
          type: 'doc',
          content: [
            {
              type: 'dangerousRawHtmlScript',
              attrs: { code: 'alert(1)' },
            },
          ],
        },
      });
    expect(unsupportedRes.status).toBe(400);
    expect(unsupportedRes.body.error).toContain('Unsupported editor node type');
  });

  it('Accepts valid Tiptap ProseMirror document structure', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        title: 'Valid Editor Document',
        content: SAMPLE_VALID_DOC_CONTENT,
      });

    expect(res.status).toBe(201);
    expect(res.body.document.title).toBe('Valid Editor Document');
    expect(res.body.version).toBe(1);
  });
});

describe('3. Concurrent Saves & Optimistic Concurrency Control', () => {
  let docId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        title: 'Optimistic Locking Test Document',
        content: SAMPLE_VALID_DOC_CONTENT,
      });
    docId = res.body.document.id;
  });

  it('PATCH with current version succeeds and increments version', async () => {
    const res = await request(app)
      .patch(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        version: 1, // matches initial version
        title: 'Optimistic Locking Test (Updated)',
      });

    expect(res.status).toBe(200);
    expect(res.body.version).toBe(2);
    expect(res.body.document.title).toBe('Optimistic Locking Test (Updated)');
  });

  it('PATCH with stale version returns 409 Conflict and preserves newer content', async () => {
    // Client attempts update with stale version 1 (server is now at version 2)
    const res = await request(app)
      .patch(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        version: 1, // Stale version!
        title: 'Overwriting Title Attempt',
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONCURRENCY_CONFLICT');
    expect(res.body.currentVersion).toBe(2);

    // Verify database was NOT overwritten
    const checkDoc = await prisma.document.findUnique({ where: { id: docId } });
    expect(checkDoc?.title).toBe('Optimistic Locking Test (Updated)');
    expect(checkDoc?.version).toBe(2);
  });

  it('PATCH requires an integer version', async () => {
    const res = await request(app)
      .patch(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        title: 'Missing Version Test',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_VERSION');
  });
});

describe('4. Access Rules & RBAC Permission Enforcement', () => {
  // From seed:
  // doc_starter_spec: Owned by Alice, shared with Bob (Editor), NOT shared with Charlie
  // doc_alice_private: Owned by Alice, unshared

  it('Owner (Alice) can update both content and rename title', async () => {
    const doc = await prisma.document.findUnique({ where: { id: 'doc_starter_spec' } });
    const currentVer = doc!.version;

    const res = await request(app)
      .patch('/api/documents/doc_starter_spec')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        version: currentVer,
        title: 'DraftSpace Product Specification (Owner Updated)',
      });

    expect(res.status).toBe(200);
    expect(res.body.document.title).toBe('DraftSpace Product Specification (Owner Updated)');
  });

  it('Shared Editor (Bob) can update content', async () => {
    const doc = await prisma.document.findUnique({ where: { id: 'doc_starter_spec' } });
    const currentVer = doc!.version;

    const res = await request(app)
      .patch('/api/documents/doc_starter_spec')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        version: currentVer,
        content: SAMPLE_VALID_DOC_CONTENT,
      });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('editor');
    expect(res.body.version).toBe(currentVer + 1);
  });

  it('Shared Editor (Bob) CANNOT rename title (403 Forbidden)', async () => {
    const doc = await prisma.document.findUnique({ where: { id: 'doc_starter_spec' } });
    const currentVer = doc!.version;

    const res = await request(app)
      .patch('/api/documents/doc_starter_spec')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        version: currentVer,
        title: "Bob's Unauthorized Title",
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_RENAME');
  });

  it('Mixed update (content + title) by editor is rejected atomically with 403', async () => {
    const doc = await prisma.document.findUnique({ where: { id: 'doc_starter_spec' } });
    const currentVer = doc!.version;

    const res = await request(app)
      .patch('/api/documents/doc_starter_spec')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        version: currentVer,
        title: 'Mixed Unauthorized Rename',
        content: SAMPLE_VALID_DOC_CONTENT,
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_RENAME');

    // Verify version and content were untouched
    const checkDoc = await prisma.document.findUnique({ where: { id: 'doc_starter_spec' } });
    expect(checkDoc?.version).toBe(currentVer);
  });

  it('Unshared User (Charlie) cannot read private memo (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/documents/doc_alice_private')
      .set('Authorization', `Bearer ${charlieToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('Unshared User (Charlie) cannot update private memo (403 Forbidden)', async () => {
    const res = await request(app)
      .patch('/api/documents/doc_alice_private')
      .set('Authorization', `Bearer ${charlieToken}`)
      .send({
        version: 1,
        content: SAMPLE_VALID_DOC_CONTENT,
      });

    expect(res.status).toBe(403);
  });

  it('GET /api/documents never includes inaccessible documents in list response', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${charlieToken}`);

    expect(res.status).toBe(200);
    const ownedIds = res.body.owned.map((d: any) => d.id);
    const sharedIds = res.body.shared.map((d: any) => d.id);

    // Charlie must NOT see Alice's private memo anywhere
    expect(ownedIds).not.toContain('doc_alice_private');
    expect(sharedIds).not.toContain('doc_alice_private');
  });

  it('Non-owner collaborator cannot delete document (403 Forbidden)', async () => {
    const res = await request(app)
      .delete('/api/documents/doc_starter_spec')
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('5. Sharing Management & Complete End-to-End Demonstration', () => {
  let demoDocId: string;

  it('Alice creates a new document for the sharing demonstration', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Sharing Demo Specification' });

    expect(res.status).toBe(201);
    expect(res.body.document.ownerId).toBe('user_alice');
    demoDocId = res.body.document.id;
  });

  it('Alice shares the document with Bob (POST /api/documents/:id/shares)', async () => {
    const res = await request(app)
      .post(`/api/documents/${demoDocId}/shares`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ userId: 'user_bob' });

    expect(res.status).toBe(200);
    expect(res.body.share.userId).toBe('user_bob');
    expect(res.body.share.documentId).toBe(demoDocId);
  });

  it('Bob sees the document under "Shared with me" and can edit content', async () => {
    // 1. Bob lists documents
    const listRes = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${bobToken}`);
    expect(listRes.status).toBe(200);
    const sharedIds = listRes.body.shared.map((d: any) => d.id);
    expect(sharedIds).toContain(demoDocId);

    // 2. Bob reads the document
    const readRes = await request(app)
      .get(`/api/documents/${demoDocId}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.role).toBe('editor');

    // 3. Bob edits content
    const editRes = await request(app)
      .patch(`/api/documents/${demoDocId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        version: readRes.body.version,
        content: SAMPLE_VALID_DOC_CONTENT,
      });
    expect(editRes.status).toBe(200);
    expect(editRes.body.version).toBe(readRes.body.version + 1);
  });

  it('Charlie cannot access the document by direct URL/API (403 Forbidden)', async () => {
    // Direct read attempt
    const readRes = await request(app)
      .get(`/api/documents/${demoDocId}`)
      .set('Authorization', `Bearer ${charlieToken}`);
    expect(readRes.status).toBe(403);
    expect(readRes.body.code).toBe('FORBIDDEN');

    // Direct write attempt
    const writeRes = await request(app)
      .patch(`/api/documents/${demoDocId}`)
      .set('Authorization', `Bearer ${charlieToken}`)
      .send({ version: 1, content: SAMPLE_VALID_DOC_CONTENT });
    expect(writeRes.status).toBe(403);
    expect(writeRes.body.code).toBe('FORBIDDEN');
  });

  it('Bob (shared editor) cannot rename the document (403 FORBIDDEN_RENAME)', async () => {
    const docRes = await request(app)
      .get(`/api/documents/${demoDocId}`)
      .set('Authorization', `Bearer ${bobToken}`);

    const renameRes = await request(app)
      .patch(`/api/documents/${demoDocId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        version: docRes.body.version,
        title: 'Hacked Title By Bob',
      });

    expect(renameRes.status).toBe(403);
    expect(renameRes.body.code).toBe('FORBIDDEN_RENAME');
  });

  it('Bob (shared editor) cannot grant or revoke access (403 Forbidden)', async () => {
    // Attempt grant
    const grantRes = await request(app)
      .post(`/api/documents/${demoDocId}/shares`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ userId: 'user_charlie' });
    expect(grantRes.status).toBe(403);
    expect(grantRes.body.code).toBe('FORBIDDEN');

    // Attempt list shares
    const listSharesRes = await request(app)
      .get(`/api/documents/${demoDocId}/shares`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(listSharesRes.status).toBe(403);

    // Attempt revoke
    const revokeRes = await request(app)
      .delete(`/api/documents/${demoDocId}/shares/user_bob`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(revokeRes.status).toBe(403);
  });

  it('Alice revokes Bob access; Bob subsequent read/write fails with 403', async () => {
    // 1. Alice revokes Bob
    const revokeRes = await request(app)
      .delete(`/api/documents/${demoDocId}/shares/user_bob`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.success).toBe(true);

    // 2. Bob subsequent read fails
    const bobRead = await request(app)
      .get(`/api/documents/${demoDocId}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(bobRead.status).toBe(403);
    expect(bobRead.body.code).toBe('FORBIDDEN');

    // 3. Bob subsequent write fails
    const bobWrite = await request(app)
      .patch(`/api/documents/${demoDocId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ version: 2, content: SAMPLE_VALID_DOC_CONTENT });
    expect(bobWrite.status).toBe(403);
    expect(bobWrite.body.code).toBe('FORBIDDEN');

    // 4. Alice still has full access
    const aliceRead = await request(app)
      .get(`/api/documents/${demoDocId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(aliceRead.status).toBe(200);
    expect(aliceRead.body.role).toBe('owner');
  });

  it('Rejects self-sharing with 400', async () => {
    const res = await request(app)
      .post('/api/documents/doc_starter_spec/shares')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ userId: 'user_alice' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SELF_SHARE_REJECTED');
  });

  it('Rejects sharing with unknown user with 404', async () => {
    const res = await request(app)
      .post('/api/documents/doc_starter_spec/shares')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ userId: 'non_existent_user_999' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });
});

describe('6. File Import: Deliberate Scope (UTF-8 .txt Only, <= 1 MiB)', () => {
  it('Imports standard UTF-8 .txt file, treating lines as plain text paragraphs without tag execution', async () => {
    const plainText =
      'DraftSpace Plain Text Document\n\nLine 1: Normal paragraph.\nLine 2: <script>alert("xss")</script>\nLine 3: # Not a markdown heading';
    const fileBuffer = Buffer.from(plainText, 'utf-8');

    const res = await request(app)
      .post('/api/documents/import')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', fileBuffer, 'project-notes.txt');

    expect(res.status).toBe(201);
    expect(res.body.document.title).toBe('project-notes');
    expect(res.body.document.ownerId).toBe('user_alice');
    expect(res.body.version).toBe(1);

    // Verify stored content treats script and hash as plain text
    const parsed = JSON.parse(res.body.document.content);
    expect(parsed.type).toBe('doc');
    const texts = parsed.content
      .filter((p: any) => p.content && p.content[0])
      .map((p: any) => p.content[0].text);
    expect(texts).toContain('Line 2: <script>alert("xss")</script>');
    expect(texts).toContain('Line 3: # Not a markdown heading');
  });

  it('Accepts Unicode text with optional UTF-8 BOM', async () => {
    const bomBuffer = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]), // UTF-8 BOM
      Buffer.from('Unicode content with emojis 🚀 and accents: café, résumé', 'utf-8'),
    ]);

    const res = await request(app)
      .post('/api/documents/import')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', bomBuffer, 'unicode-bom.txt');

    expect(res.status).toBe(201);
    const parsed = JSON.parse(res.body.document.content);
    expect(parsed.content[0].content[0].text).toContain('Unicode content with emojis 🚀');
  });

  it('Accepts case-insensitive extension (.TXT)', async () => {
    const buffer = Buffer.from('Uppercase extension test', 'utf-8');
    const res = await request(app)
      .post('/api/documents/import')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', buffer, 'NOTES.TXT');

    expect(res.status).toBe(201);
    expect(res.body.document.title).toBe('NOTES');
  });

  it('Rejects non-.txt files (.md, .docx, .html) with 400 UNSUPPORTED_FILE_TYPE', async () => {
    // Markdown
    const mdRes = await request(app)
      .post('/api/documents/import')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', Buffer.from('# Heading', 'utf-8'), 'notes.md');
    expect(mdRes.status).toBe(400);
    expect(mdRes.body.code).toBe('UNSUPPORTED_FILE_TYPE');

    // DOCX
    const docxRes = await request(app)
      .post('/api/documents/import')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', Buffer.from('PK\x03\x04', 'utf-8'), 'document.docx');
    expect(docxRes.status).toBe(400);
    expect(docxRes.body.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('Rejects zero-byte empty file with 400 EMPTY_FILE', async () => {
    const res = await request(app)
      .post('/api/documents/import')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', Buffer.alloc(0), 'empty.txt');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('EMPTY_FILE');
    expect(res.body.error).toContain('empty');
  });

  it('Rejects binary content containing null bytes with 400 BINARY_FILE_REJECTED', async () => {
    const binaryBuffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x57, 0x6f, 0x72, 0x6c, 0x64]);
    const res = await request(app)
      .post('/api/documents/import')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', binaryBuffer, 'binary.txt');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BINARY_FILE_REJECTED');
  });

  it('Rejects malformed UTF-8 sequences with 400 MALFORMED_UTF8', async () => {
    // Invalid UTF-8 byte sequence
    const malformedBuffer = Buffer.from([0xc3, 0x28]);
    const res = await request(app)
      .post('/api/documents/import')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', malformedBuffer, 'malformed.txt');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MALFORMED_UTF8');
  });

  it('Rejects oversized files (> 1 MiB) with 400 FILE_TOO_LARGE', async () => {
    // 1 MiB + 100 bytes
    const largeBuffer = Buffer.alloc(1024 * 1024 + 100, 0x61); // 'a' characters
    const res = await request(app)
      .post('/api/documents/import')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', largeBuffer, 'large.txt');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('FILE_TOO_LARGE');
  });
});
