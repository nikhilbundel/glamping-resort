/**
 * Clear every admin login lockout (e.g. if someone locked your email by guessing).
 *   npm run admin:unlock
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
prisma.loginAttempt
  .deleteMany()
  .then((r) => console.log(`✔ Cleared ${r.count} login lock record(s). You can sign in again now.`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
