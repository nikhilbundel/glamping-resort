/**
 * Set (or change) the admin login on an EXISTING site, without re-seeding.
 *
 *   npm run admin:set
 *
 * Reads ADMIN_EMAIL from .env. The password is read from ADMIN_PASSWORD in .env if present,
 * otherwise you are asked to type it (hidden) — so it never has to be stored in a file.
 *
 * It:  • updates the Super Admin's email and password (stored only as a bcrypt hash)
 *      • disables the old demo admin account, if it still exists
 *      • signs EVERY admin out of every open session (everyone must log in again)
 *      • clears any login lockouts
 * The password is never printed or logged.
 */
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LEGACY_DEMO_ADMIN = 'admin@example.com';

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    let muted = false;
    out._writeToOutput = (s: string) => {
      if (!muted) out.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set ADMIN_EMAIL in .env first (the new admin login email).');
  let password = process.env.ADMIN_PASSWORD || '';
  if (!password) {
    if (!process.stdin.isTTY) throw new Error('No ADMIN_PASSWORD in .env and no terminal to type it in.');
    password = await askHidden(`New password for ${email}: `);
    const again = await askHidden('Type it again: ');
    if (password !== again) throw new Error('The two passwords do not match — nothing was changed.');
  }
  if (password.length < 10) throw new Error('The password must be at least 10 characters — nothing was changed.');

  const passwordHash = await bcrypt.hash(password, 12);
  password = '';

  // Which account becomes the admin: one that already has the new email, else the old demo admin, else the first Super Admin.
  const target =
    (await prisma.user.findUnique({ where: { email } })) ||
    (await prisma.user.findUnique({ where: { email: LEGACY_DEMO_ADMIN } })) ||
    (await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, orderBy: { createdAt: 'asc' } }));

  await prisma.$transaction(async (tx) => {
    if (target) await tx.user.update({ where: { id: target.id }, data: { email, passwordHash, role: 'SUPER_ADMIN', active: true } });
    else await tx.user.create({ data: { email, name: 'Site Admin', role: 'SUPER_ADMIN', passwordHash } });
    // the old demo login must stop working even if it was a separate account
    await tx.user.updateMany({ where: { email: LEGACY_DEMO_ADMIN }, data: { active: false } });
    // sign everybody out of every open session
    await tx.user.updateMany({ data: { sessionVersion: { increment: 1 } } });
    await tx.loginAttempt.deleteMany();
    await tx.activityLog.create({ data: { userName: 'admin:set script', action: 'update', entity: 'user', summary: `Admin login changed to ${email}; all sessions signed out` } });
  });
  console.log(`\n✔ Admin login is now ${email}.`);
  console.log('✔ Every open admin session has been signed out — log in again at /admin/login.');
  if (process.env.ADMIN_PASSWORD) console.log('  Tip: you can now delete the ADMIN_PASSWORD line from .env.');
  console.log('');
}

main()
  .catch((e) => {
    console.error(`\n✖ ${(e as Error).message}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
