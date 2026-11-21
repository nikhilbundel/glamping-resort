import { getSettings } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Maintenance', robots: { index: false } };

export default async function Maintenance() {
  const s = await getSettings();
  return (
    <main className="flex min-h-screen items-center justify-center bg-primary-dark p-6 text-center text-white">
      <div className="max-w-xl">
        <p className="eyebrow text-white/70">{s.general.siteName}</p>
        <h1 className="mt-4 font-heading text-h2 font-semibold">{s.maintenance.heading}</h1>
        <p className="mt-5 text-white/80">{s.maintenance.message}</p>
      </div>
    </main>
  );
}
