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

describe('5. Sharing Management & Constraint Integrity', () => {
  it('Owner (Alice) can list shares, non-owner rejected with 403', async () => {
    // Alice (Owner)
    const aliceRes = await request(app)
      .get('/api/documents/doc_starter_spec/shares')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(aliceRes.status).toBe(200);
    expect(Array.isArray(aliceRes.body)).toBe(true);

    // Bob (Editor, not owner)
    const bobRes = await request(app)
      .get('/api/documents/doc_starter_spec/shares')
      .set('Authorization', `Bearer ${bobToken}`);
    expect(bobRes.status).toBe(403);
  });

  it('Owner (Alice) grants access to Charlie; duplicate grant is safe and idempotent', async () => {
    // Initial grant
    const res1 = await request(app)
      .post('/api/documents/doc_starter_spec/shares')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ userId: 'user_charlie' });

    expect(res1.status).toBe(200);
    expect(res1.body.share.userId).toBe('user_charlie');

    // Duplicate grant (safe & idempotent)
    const res2 = await request(app)
      .post('/api/documents/doc_starter_spec/shares')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ userId: 'user_charlie' });

    expect(res2.status).toBe(200);

    // Verify Charlie can now read the document
    const charlieRead = await request(app)
      .get('/api/documents/doc_starter_spec')
      .set('Authorization', `Bearer ${charlieToken}`);
    expect(charlieRead.status).toBe(200);
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

  it('Owner (Alice) revokes Charlie access; Charlie loses read access', async () => {
    const revokeRes = await request(app)
      .delete('/api/documents/doc_starter_spec/shares/user_charlie')
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(revokeRes.status).toBe(200);

    // Charlie is blocked again
    const charlieRead = await request(app)
      .get('/api/documents/doc_starter_spec')
      .set('Authorization', `Bearer ${charlieToken}`);

    expect(charlieRead.status).toBe(403);
  });
});

describe('6. Product-Relevant File Import (.txt / .md)', () => {
  it('POST /api/documents/import parses plain text/markdown into valid editor JSON with version 1', async () => {
    const fileContent = Buffer.from(
      '# Engineering Handbook\n\nWelcome to DraftSpace.\n\n- Zero-downtime releases\n- Optimistic locking',
      'utf-8'
    );

    const res = await request(app)
      .post('/api/documents/import')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', fileContent, 'engineering-handbook.md');

    expect(res.status).toBe(201);
    expect(res.body.document.title).toBe('engineering-handbook');
    expect(res.body.document.ownerId).toBe('user_alice');
    expect(res.body.version).toBe(1);

    // Verify stored content is valid editor JSON
    const parsed = JSON.parse(res.body.document.content);
    expect(parsed.type).toBe('doc');
    expect(parsed.content.length).toBeGreaterThan(0);
  });
});
