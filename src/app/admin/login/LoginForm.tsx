'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Btn, Input, Label } from '@/components/admin/ui';

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError('');
    const res = await signIn('credentials', { email: fd.get('email'), password: fd.get('password'), redirect: false });
    setLoading(false);
    if (!res || res.error) {
      setError(res?.error && res.error !== 'CredentialsSignin' ? res.error : 'Invalid email or password.');
      return;
    }
    router.replace(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4 text-zinc-900">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <Btn type="submit" variant="primary" loading={loading} className="w-full">
        Sign in
      </Btn>
    </form>
  );
}
