import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in', robots: { index: false } };

export default function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  const cb = searchParams.callbackUrl && searchParams.callbackUrl.startsWith('/admin') ? searchParams.callbackUrl : '/admin';
  return (
    <main className="admin-ui flex min-h-screen items-center justify-center bg-zinc-100 p-4" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Resort <span className="text-emerald-600">CMS</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in to manage your website.</p>
        <LoginForm callbackUrl={cb} />
      </div>
    </main>
  );
}
