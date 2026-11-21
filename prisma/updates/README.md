# Database updates for existing sites

`prisma/migrations/` is created on your machine by `npx prisma migrate dev --name init` (fresh install) — that
first migration already contains everything, so **a fresh install needs nothing from this folder**.

If your database was created with an older version, add each update below to your own `prisma/migrations/`
folder and apply it:

```bash
cp -r prisma/updates/20261121120000_login_security prisma/migrations/
npx prisma migrate deploy      # VPS / production
# or, on your laptop:  npx prisma migrate dev
```

| Update | What it adds |
|---|---|
| `20261121120000_login_security` | `User.sessionVersion` (sign out everywhere) and the `LoginAttempt` table (3 wrong passwords → 1 hour lock) |
