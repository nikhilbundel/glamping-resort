/**
 * One-time helper: replaces the "[YOUR RESORT NAME]" / "[LOCATION]" placeholders that are already
 * saved in your database (site settings, SEO, page descriptions, section text) with your real details.
 * Nothing else is changed. Safe to run more than once.
 *
 *   npx tsx --env-file=.env scripts/apply-brand.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';

const NAME = 'Glamo Home Cheog';
const LOCATION = 'Cheog, Shimla';

const prisma = new PrismaClient();
const fix = (s: string) =>
  s
    .replace(/Forest Road, Upper Village\\n\[LOCATION\] — 000 000/g, 'Cheog, Shimla\\nHimachal Pradesh, India')
    .replace(/Forest Road, Upper Village\n\[LOCATION\] — 000 000/g, 'Cheog, Shimla\nHimachal Pradesh, India')
    .replace(/\[YOUR RESORT NAME\]/g, NAME)
    .replace(/\[LOCATION\]/g, LOCATION);
const fixJson = (v: unknown) => {
  if (v === null || v === undefined) return { changed: false, value: v };
  const before = JSON.stringify(v);
  const after = fix(before);
  return { changed: before !== after, value: JSON.parse(after) as Prisma.InputJsonValue };
};

async function main() {
  let n = 0;
  for (const s of await prisma.setting.findMany()) {
    const r = fixJson(s.value);
    if (r.changed) { await prisma.setting.update({ where: { key: s.key }, data: { value: r.value as Prisma.InputJsonValue } }); n++; }
  }
  for (const p of await prisma.page.findMany()) {
    const data: Record<string, string> = {};
    for (const k of ['title', 'seoTitle', 'seoDescription'] as const) {
      const v = p[k];
      if (typeof v === 'string' && fix(v) !== v) data[k] = fix(v);
    }
    if (Object.keys(data).length) { await prisma.page.update({ where: { id: p.id }, data }); n++; }
  }
  for (const s of await prisma.section.findMany()) {
    const d = fixJson(s.data);
    const dd = fixJson(s.draftData);
    if (d.changed || dd.changed) {
      await prisma.section.update({
        where: { id: s.id },
        data: { data: d.value as Prisma.InputJsonValue, ...(dd.changed ? { draftData: dd.value as Prisma.InputJsonValue } : {}) },
      });
      n++;
    }
  }
  console.log(`✔ Updated ${n} records with "${NAME}" / "${LOCATION}". Restart "npm run dev" (or refresh) to see it.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
