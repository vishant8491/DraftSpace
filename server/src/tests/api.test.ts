import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../prisma.js';
import { seed } from '../../prisma/seed.js';

let alexToken: string;
let morganToken: string;
let samToken: string;

beforeAll(async () => {
  // Ensure database is freshly seeded
  await seed();

  // Retrieve demo session tokens
  const alexSession = await prisma.session.findFirst({ where: { userId: 'user_alex' } });
  const morganSession = await prisma.session.findFirst({ where: { userId: 'user_morgan' } });
  const samSession = await prisma.session.findFirst({ where: { userId: 'user_sam' } });

  alexToken = alexSession!.token;
  morganToken = morganSession!.token;
  samToken = samSession!.token;
});

describe('1. Health & Authentication', () => {
  it('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/auth/users should return 3 demo users', async () => {
    const res = await request(app).get('/api/auth/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/documents without token should return 401 Unauthorized', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/auth/me with valid Bearer token returns current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${alexToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alex@draftspace.dev');
  });
});

describe('2. Document CRUD & Renaming', () => {
  let createdDocId: string;

  it('POST /api/documents creates a new document with owner role', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${alexToken}`)
      .send({
        title: 'Q4 Product Roadmap',
        content: '<p>Initial roadmap content</p>',
      });

    expect(res.status).toBe(201);
    expect(res.body.document.title).toBe('Q4 Product Roadmap');
    expect(res.body.document.role).toBe('owner');
    expect(res.body.document.ownerId).toBe('user_alex');
    createdDocId = res.body.document.id;
  });

  it('PUT /api/documents/:id renames the document', async () => {
    const res = await request(app)
      .put(`/api/documents/${createdDocId}`)
      .set('Authorization', `Bearer ${alexToken}`)
      .send({
        title: 'Q4 Product Roadmap (Revised)',
      });

    expect(res.status).toBe(200);
    expect(res.body.document.title).toBe('Q4 Product Roadmap (Revised)');
  });

  it('PUT /api/documents/:id rejects empty title with 400 Bad Request', async () => {
    const res = await request(app)
      .put(`/api/documents/${createdDocId}`)
      .set('Authorization', `Bearer ${alexToken}`)
      .send({
        title: '   ',
      });

    expect(res.status).toBe(400);
  });
});

describe('3. Access Control & Permission Enforcement', () => {
  // From seed:
  // doc_product_strategy: Owned by Alex, shared with Morgan (Editor), Sam (Viewer)
  // doc_private_memo: Owned by Alex, not shared

  it('Owner (Alex) can update content', async () => {
    const res = await request(app)
      .put('/api/documents/doc_product_strategy')
      .set('Authorization', `Bearer ${alexToken}`)
      .send({ content: '<p>Updated by owner Alex</p>' });

    expect(res.status).toBe(200);
    expect(res.body.document.content).toContain('Updated by owner Alex');
  });

  it('Editor (Morgan) can update content', async () => {
    const res = await request(app)
      .put('/api/documents/doc_product_strategy')
      .set('Authorization', `Bearer ${morganToken}`)
      .send({ content: '<p>Updated by editor Morgan</p>' });

    expect(res.status).toBe(200);
    expect(res.body.document.content).toContain('Updated by editor Morgan');
  });

  it('Viewer (Sam) is BLOCKED from updating content (403 Forbidden)', async () => {
    const res = await request(app)
      .put('/api/documents/doc_product_strategy')
      .set('Authorization', `Bearer ${samToken}`)
      .send({ content: '<p>Attempted unauthorized edit by viewer Sam</p>' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('Unshared user (Sam) cannot view private memo (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/documents/doc_private_memo')
      .set('Authorization', `Bearer ${samToken}`);

    expect(res.status).toBe(403);
  });

  it('Collaborator (Morgan) cannot delete document owned by Alex (403 Forbidden)', async () => {
    const res = await request(app)
      .delete('/api/documents/doc_product_strategy')
      .set('Authorization', `Bearer ${morganToken}`);

    expect(res.status).toBe(403);
  });
});

describe('4. Sharing & Permission Delegation', () => {
  it('Owner (Alex) can grant Sam access to private memo', async () => {
    const res = await request(app)
      .post('/api/documents/doc_private_memo/shares')
      .set('Authorization', `Bearer ${alexToken}`)
      .send({
        userId: 'user_sam',
        role: 'editor',
      });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('editor');
    expect(res.body.userId).toBe('user_sam');

    // Now Sam should be able to read it
    const readRes = await request(app)
      .get('/api/documents/doc_private_memo')
      .set('Authorization', `Bearer ${samToken}`);

    expect(readRes.status).toBe(200);
    expect(readRes.body.role).toBe('editor');
  });

  it('Non-owner cannot modify sharing (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/documents/doc_private_memo/shares')
      .set('Authorization', `Bearer ${morganToken}`)
      .send({
        userId: 'user_morgan',
        role: 'editor',
      });

    expect(res.status).toBe(403);
  });

  it('Owner (Alex) can revoke Sam access', async () => {
    const res = await request(app)
      .delete('/api/documents/doc_private_memo/shares/user_sam')
      .set('Authorization', `Bearer ${alexToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Now Sam is blocked again
    const readRes = await request(app)
      .get('/api/documents/doc_private_memo')
      .set('Authorization', `Bearer ${samToken}`);

    expect(readRes.status).toBe(403);
  });
});

describe('5. Product-Relevant File Import (.txt / .md)', () => {
  it('POST /api/upload/import creates a new document from UTF-8 text file', async () => {
    const testContent = Buffer.from(
      '# Architecture Decisions\n\n- React with Tiptap for rich text\n- Express with Prisma for persistence\n- Role-based document access',
      'utf-8'
    );

    const res = await request(app)
      .post('/api/upload/import')
      .set('Authorization', `Bearer ${alexToken}`)
      .attach('file', testContent, 'architecture-notes.md');

    expect(res.status).toBe(201);
    expect(res.body.document.title).toBe('architecture-notes');
    expect(res.body.document.ownerId).toBe('user_alex');
    expect(res.body.document.content).toContain('Architecture Decisions');
    expect(res.body.document.content).toContain('React with Tiptap');
  });
});
