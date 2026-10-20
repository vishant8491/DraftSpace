import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STARTER_SPEC_JSON = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'DraftSpace Product Specification' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Welcome to ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'DraftSpace' },
        {
          type: 'text',
          text: ', an editor with optimistic concurrency control and strict role-based access.',
        },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Strict RBAC: Only owners can rename titles or manage sharing.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Shared editors can update document body content using atomic versioning.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Unshared users cannot view, edit, or list private documents.',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

const RESEARCH_NOTES_JSON = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: "Bob's Architecture Research Notes" }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Document updates require explicit version matching to prevent lost updates.',
        },
      ],
    },
  ],
});

const PRIVATE_MEMO_JSON = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: "Alice's Private Executive Memo" }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Confidential: this document is not shared with Bob or Charlie.',
        },
      ],
    },
  ],
});

export async function seed() {
  console.log('[DraftSpace Seed] Seeding demo users idempotently...');

  // Upsert Alice
  const alice = await prisma.user.upsert({
    where: { email: 'alice@draftspace.dev' },
    update: { displayName: 'Alice Smith' },
    create: {
      id: 'user_alice',
      email: 'alice@draftspace.dev',
      displayName: 'Alice Smith',
    },
  });

  // Upsert Bob
  const bob = await prisma.user.upsert({
    where: { email: 'bob@draftspace.dev' },
    update: { displayName: 'Bob Jones' },
    create: {
      id: 'user_bob',
      email: 'bob@draftspace.dev',
      displayName: 'Bob Jones',
    },
  });

  // Upsert Charlie
  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@draftspace.dev' },
    update: { displayName: 'Charlie Brown' },
    create: {
      id: 'user_charlie',
      email: 'charlie@draftspace.dev',
      displayName: 'Charlie Brown',
    },
  });

  console.log(`[DraftSpace Seed] Ensured 3 demo users: ${alice.displayName}, ${bob.displayName}, ${charlie.displayName}`);

  // Seed Doc 1: Alice's Shared Spec
  const doc1 = await prisma.document.upsert({
    where: { id: 'doc_starter_spec' },
    update: {
      version: 1,
      title: 'DraftSpace Product Specification',
      content: STARTER_SPEC_JSON,
    },
    create: {
      id: 'doc_starter_spec',
      title: 'DraftSpace Product Specification',
      content: STARTER_SPEC_JSON,
      ownerId: alice.id,
      version: 1,
    },
  });

  // Share Doc 1 with Bob
  await prisma.documentShare.upsert({
    where: {
      documentId_userId: {
        documentId: doc1.id,
        userId: bob.id,
      },
    },
    update: {},
    create: {
      documentId: doc1.id,
      userId: bob.id,
    },
  });

  // Seed Doc 2: Bob's Notes
  await prisma.document.upsert({
    where: { id: 'doc_bob_notes' },
    update: {
      version: 1,
      title: "Bob's Research Notes",
      content: RESEARCH_NOTES_JSON,
    },
    create: {
      id: 'doc_bob_notes',
      title: "Bob's Research Notes",
      content: RESEARCH_NOTES_JSON,
      ownerId: bob.id,
      version: 1,
    },
  });

  // Seed Doc 3: Alice's Private Memo (Unshared)
  await prisma.document.upsert({
    where: { id: 'doc_alice_private' },
    update: {
      version: 1,
      title: "Alice's Private Executive Memo",
      content: PRIVATE_MEMO_JSON,
    },
    create: {
      id: 'doc_alice_private',
      title: "Alice's Private Executive Memo",
      content: PRIVATE_MEMO_JSON,
      ownerId: alice.id,
      version: 1,
    },
  });

  console.log('[DraftSpace Seed] ✅ Idempotent seed finished successfully.');
}

if (require.main === module || process.argv[1]?.includes('seed')) {
  seed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
