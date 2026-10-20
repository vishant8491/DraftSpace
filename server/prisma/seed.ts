import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seed() {
  console.log('Seeding DraftSpace database...');

  // Clean existing data in reverse order of dependencies
  await prisma.session.deleteMany();
  await prisma.documentShare.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();

  // Create Seed Users
  const alex = await prisma.user.create({
    data: {
      id: 'user_alex',
      email: 'alex@draftspace.dev',
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  const morgan = await prisma.user.create({
    data: {
      id: 'user_morgan',
      email: 'morgan@draftspace.dev',
      name: 'Morgan Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  });

  const sam = await prisma.user.create({
    data: {
      id: 'user_sam',
      email: 'sam@draftspace.dev',
      name: 'Sam Taylor',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
  });

  console.log(`Created 3 demo users: ${alex.name}, ${morgan.name}, ${sam.name}`);

  // Create Active Demo Sessions
  await prisma.session.createMany({
    data: [
      {
        id: 'session_alex',
        token: 'session_alex_token_2026',
        userId: alex.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
      },
      {
        id: 'session_morgan',
        token: 'session_morgan_token_2026',
        userId: morgan.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
      {
        id: 'session_sam',
        token: 'session_sam_token_2026',
        userId: sam.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    ],
  });

  // Seed Document 1 (Owned by Alex, shared with Morgan as Editor, Sam as Viewer)
  const doc1 = await prisma.document.create({
    data: {
      id: 'doc_product_strategy',
      title: 'Q4 Product Strategy & Architecture',
      content: `<h1>Q4 Product Strategy &amp; Architecture</h1>
<p>Welcome to <strong>DraftSpace</strong>, a clean and lightweight shared document editor built for high-focus engineering and design teams.</p>
<h2>Core Objectives</h2>
<ul>
<li><strong>Streamlined rich-text editing</strong> with headings, lists, bold, italics, and underlines.</li>
<li><em>Clear and transparent access control</em> distinguishing owned vs. shared documents.</li>
<li><u>Zero friction file imports</u> allowing plain text files to become editable documents instantly.</li>
</ul>
<h2>Action Items for the Sprint</h2>
<ol>
<li>Finalize permission matrix and role validation.</li>
<li>Implement autosave debounce with visual status feedback.</li>
<li>Verify database persistence across server restarts.</li>
</ol>
<blockquote>"Simplicity is prerequisite for reliability." &mdash; Edsger W. Dijkstra</blockquote>`,
      ownerId: alex.id,
    },
  });

  // Share Doc 1
  await prisma.documentShare.create({
    data: {
      documentId: doc1.id,
      userId: morgan.id,
      role: 'editor',
    },
  });

  await prisma.documentShare.create({
    data: {
      documentId: doc1.id,
      userId: sam.id,
      role: 'viewer',
    },
  });

  // Seed Document 2 (Owned by Morgan, shared with Alex as Editor)
  const doc2 = await prisma.document.create({
    data: {
      id: 'doc_user_interviews',
      title: 'User Interview Insights - DraftSpace Beta',
      content: `<h1>User Interview Insights &mdash; DraftSpace Beta</h1>
<p>Summary of 12 qualitative interviews conducted with engineering leads and product designers.</p>
<h2>Key Takeaways</h2>
<ul>
<li>Users loved the <strong>clear distinction</strong> between "My Documents" and "Shared with me".</li>
<li><em>Instant feedback on autosave</em> prevents anxiety about lost work.</li>
<li>Importing UTF-8 <code>.txt</code> files saved significant time when migrating legacy meeting notes.</li>
</ul>
<h2>Next Steps</h2>
<ol>
<li>Deploy to production cloud host with automated checks.</li>
<li>Record 3-5 minute video walkthrough.</li>
</ol>`,
      ownerId: morgan.id,
    },
  });

  await prisma.documentShare.create({
    data: {
      documentId: doc2.id,
      userId: alex.id,
      role: 'editor',
    },
  });

  // Seed Document 3 (Private Document Owned by Alex, Unshared)
  await prisma.document.create({
    data: {
      id: 'doc_private_memo',
      title: 'Private Executive Memo (Confidential)',
      content: `<h1>Confidential Executive Memo</h1>
<p>This document is private to <strong>Alex Rivera</strong>. Other demo users (Morgan and Sam) cannot see or edit this document in their dashboard.</p>
<p>Use this document during the assessment walkthrough to demonstrate <u>strict permission isolation</u>.</p>`,
      ownerId: alex.id,
    },
  });

  // Seed Document 4 (Owned by Sam, Unshared)
  await prisma.document.create({
    data: {
      id: 'doc_devops_runbook',
      title: 'DevOps & Deployment Runbook',
      content: `<h1>Production Deployment Runbook</h1>
<p>Steps for zero-downtime releases:</p>
<ol>
<li>Run automated test suite: <code>npm test</code>.</li>
<li>Push database migrations: <code>npm run db:setup</code>.</li>
<li>Build client and server bundles: <code>npm run build</code>.</li>
</ol>`,
      ownerId: sam.id,
    },
  });

  console.log('✅ Seed completed successfully!');
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
