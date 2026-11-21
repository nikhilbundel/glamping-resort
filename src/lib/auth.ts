import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from './db';
import { rateLimit } from './rate-limit';
import { clearFailures, clientIpFrom, lockMessage, lockRemaining, loginKeys, recordFailure } from './login-guard';
import type { Role } from './types';

const GENERIC = 'Invalid email or password.';
// bcrypt hash of a random string — compared against when the email is unknown (keeps timing the same)
const DUMMY_HASH = '$2a$12$qc7aS.AtqqPCx.GFmgo56ezhsTgRLiK4TwLNBveeAXLjx5POxWiwq';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 12 },
  pages: { signIn: '/admin/login' },
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials, req) {
        const email = String(credentials?.email || '').toLowerCase().trim().slice(0, 200);
        const password = String(credentials?.password || '').slice(0, 200);
        if (!email || !password) throw new Error(GENERIC);

        const ip = clientIpFrom(req?.headers as Record<string, unknown> | undefined);
        // cheap in-memory flood guard on top of the database lockout
        if (!rateLimit(`login:ip:${ip}`, 30, 15 * 60_000).ok) throw new Error(lockMessage(15 * 60_000));

        const keys = loginKeys(email, ip);
        // While locked, every attempt is refused — even with the right password.
        const left = await lockRemaining(keys);
        if (left > 0) throw new Error(lockMessage(left));

        const user = await prisma.user.findUnique({ where: { email } });
        // Always run bcrypt (against a dummy hash for unknown emails) so the response time doesn't reveal which emails exist.
        const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
        if (!user || !user.active || !ok) {
          const locked = await recordFailure(keys);
          throw new Error(locked > 0 ? lockMessage(locked) : GENERIC);
        }

        await clearFailures(keys);
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await prisma.activityLog.create({ data: { userId: user.id, userName: user.name, action: 'login', entity: 'auth', summary: `${user.name} signed in` } });
        return { id: user.id, name: user.name, email: user.email, role: user.role, sv: user.sessionVersion };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: Role }).role;
        token.uid = user.id;
        token.sv = (user as { sv?: number }).sv ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
        (session.user as { sv?: number }).sv = (token.sv as number) ?? 0;
      }
      return session;
    },
  },
};

export type SessionUser = { id: string; name: string; email: string; role: Role };

/**
 * The signed-in admin, re-checked against the database on every call: a deactivated user, or a session started
 * before the user's sessionVersion was raised (password change / "sign out everywhere"), counts as signed out.
 */
export async function getUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  const db = await prisma.user.findUnique({ where: { id }, select: { active: true, role: true, name: true, email: true, sessionVersion: true } });
  if (!db || !db.active || db.sessionVersion !== ((session.user as { sv?: number }).sv ?? 0)) return null;
  return { id, name: db.name, email: db.email, role: db.role as Role };
}

/** For server actions / route handlers: throws if not signed in or lacking the role. */
export async function requireUser(role?: Role): Promise<SessionUser> {
  const user = await getUser();
  if (!user) throw new Error('Not signed in');
  if (role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') throw new Error('Only a Super Admin can do this');
  return user;
}

/** For admin pages: redirects to login when signed out. */
export async function requirePageUser(role?: Role) {
  try {
    return await requireUser(role);
  } catch (e) {
    if ((e as Error).message === 'Only a Super Admin can do this') redirect('/admin?denied=1');
    redirect('/admin/login');
  }
}
