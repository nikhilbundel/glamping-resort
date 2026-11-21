import Link from 'next/link';

export default function SiteNotFound() {
  return (
    <section className="section-y">
      <div className="container max-w-2xl text-center">
        <p className="eyebrow text-accent">404</p>
        <h1 className="mt-3 font-heading text-h2">This trail doesn&rsquo;t lead anywhere</h1>
        <p className="mt-4 text-muted">The page you were looking for has moved or no longer exists.</p>
        <Link href="/" className="mt-8 inline-flex min-h-[44px] items-center rounded-btn bg-btn px-7 py-3 text-btn-ink">
          Back to home
        </Link>
      </div>
    </section>
  );
}
