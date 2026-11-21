import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-center">
      <div>
        <p className="eyebrow text-accent">404</p>
        <h1 className="mt-3 font-heading text-h2">This trail doesn&rsquo;t lead anywhere</h1>
        <p className="mt-4 text-muted">The page you were looking for has moved or no longer exists.</p>
        <Link href="/" className="mt-8 inline-flex min-h-[44px] items-center rounded-btn bg-btn px-7 py-3 text-btn-ink">
          Back to home
        </Link>
      </div>
    </main>
  );
}
