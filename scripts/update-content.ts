/**
 * One-time content update for an existing site (keeps everything else you've edited):
 *   • Heritage Mudhouse  →  Backwood Stays  (Single Room + Interconnected Room, bookable online)
 *   • Glamping Domes     →  one bookable dome
 *   • removes the Spa, Wellness Retreat and Our Eco Story pages (+ menu links, buttons, and sections promoting them are hidden)
 *   • turns on online booking (/book) and points "Book Now" buttons to it
 *
 *   npm run update-content            ← apply
 *   npm run update-content -- --dry   ← only show what would change
 *
 * A copy of everything it touches is saved first in storage/backups/before-update-content-<time>.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry');
const REMOVED = ['/spa', '/spa/wellness-retreat', '/about/our-story'];
const REMOVED_SLUGS = ['spa', 'spa/wellness-retreat', 'about/our-story'];
const isRemoved = (href: unknown) => typeof href === 'string' && REMOVED.some((r) => href === r || href.startsWith(`${r}#`) || href.startsWith(`${r}?`) || (r === '/spa' && href.startsWith('/spa/')));

const log: string[] = [];
const todo: string[] = [];
const say = (s: string) => {
  log.push(s);
  console.log(`  • ${s}`);
};

/** Name / link replacements applied to every text value. */
function renameText(s: string) {
  return s
    .replace(/\/stays\/mudhouse/g, '/stays/backwood')
    .replace(/Heritage Mudhouse/g, 'Backwood Stays')
    .replace(/Heritage mudhouse/g, 'Backwood stays')
    .replace(/heritage mudhouse/g, 'Backwood Stays');
}
/** Walk JSON: rename text, drop buttons/links/cards pointing to removed pages. Returns [newValue, removedLinks]. */
function cleanJson(v: unknown): [unknown, number] {
  let removed = 0;
  const walk = (x: unknown): unknown => {
    if (typeof x === 'string') return renameText(x);
    if (Array.isArray(x)) {
      return x
        .filter((i) => {
          const drop = i && typeof i === 'object' && !Array.isArray(i) && isRemoved((i as { href?: unknown }).href);
          if (drop) removed++;
          return !drop;
        })
        .map(walk);
    }
    if (x && typeof x === 'object') {
      const o: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(x)) o[k] = walk(val);
      // single link objects (e.g. cta: { href }) pointing to a removed page → send to Home
      if (isRemoved(o.href)) {
        o.href = '/';
        removed++;
      }
      return o;
    }
    return x;
  };
  return [walk(v), removed];
}
/** "Book Now" style buttons that go to the enquiry form → online booking. */
function bookButtons(v: unknown): [unknown, number] {
  let n = 0;
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      const o: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(x)) o[k] = walk(val);
      if (typeof o.label === 'string' && /^\s*book/i.test(o.label) && typeof o.href === 'string' && /^\/contact(#enquiry)?$/.test(o.href)) {
        o.href = '/book';
        n++;
      }
      return o;
    }
    return x;
  };
  return [walk(v), n];
}
const mentions = (v: unknown) => {
  const s = JSON.stringify(v ?? '');
  return /mud ?house|\bspa\b|wellness retreat|eco story/i.test(s.replace(/"(url|image|poster|src|publicId)":"[^"]*"/g, ''));
};
const priceFromText = (s?: string | null) => {
  const m = s?.replace(/,/g, '').match(/(\d{3,7})/);
  return m ? Number(m[1]) : null;
};

async function main() {
  console.log(DRY ? '\nDRY RUN — nothing will be saved.\n' : '\nUpdating your website content…\n');

  // ── safety copy ──
  const snapshot = {
    takenAt: new Date().toISOString(),
    pages: await prisma.page.findMany({ include: { sections: true } }),
    menus: await prisma.menu.findMany(),
    settings: await prisma.setting.findMany(),
    stays: await prisma.stay.findMany({ include: { rooms: true } }),
    redirects: await prisma.redirect.findMany(),
    faqs: await prisma.faq.findMany(),
  };
  if (!DRY) {
    const dir = path.join(process.cwd(), 'storage', 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `before-update-content-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 1));
    console.log(`Saved a copy of the current content: ${path.relative(process.cwd(), file)}\n`);
  }
  const run = async (fn: () => Promise<unknown>) => {
    if (!DRY) await fn();
  };

  // ── 1. Stays & rooms ──
  console.log('Stays & rooms');
  let backwood = await prisma.stay.findFirst({ where: { slug: 'backwood' } });
  const mud = await prisma.stay.findFirst({ where: { OR: [{ slug: 'mudhouse' }, { name: { contains: 'Mudhouse' } }] } });
  const backwoodData = { name: 'Backwood Stays', eyebrow: 'Tucked into the woods', summary: 'Two cosy rooms among the pines — a private room for two and an interconnected room for families and friends.', pageSlug: 'stays/backwood' };
  if (!backwood && mud) {
    say(`Renamed stay "${mud.name}" → "Backwood Stays" (/stays/backwood)`);
    await run(() => prisma.stay.update({ where: { id: mud.id }, data: { ...backwoodData, slug: 'backwood' } }));
    backwood = { ...mud, ...backwoodData, slug: 'backwood' };
  } else if (!backwood) {
    say('Created stay "Backwood Stays"');
    if (!DRY) backwood = await prisma.stay.create({ data: { ...backwoodData, slug: 'backwood', order: 1 } });
  } else say('Stay "Backwood Stays" already exists — kept');

  if (backwood) {
    const rooms = DRY && !backwood.id ? [] : await prisma.room.findMany({ where: { stayId: backwood.id }, orderBy: { order: 'asc' } });
    const keepNames = ['Single Room', 'Interconnected Room'];
    for (const r of rooms.filter((r) => !keepNames.includes(r.name) && r.published)) {
      say(`Hid old room "${r.name}" (unpublished, not deleted)`);
      await run(() => prisma.room.update({ where: { id: r.id }, data: { published: false, bookable: false } }));
    }
    const imgs = (rooms.find((r) => Array.isArray(r.images) && (r.images as unknown[]).length)?.images ?? Prisma.DbNull) as Prisma.InputJsonValue;
    const defs = [
      { name: 'Single Room', description: 'A private room for two among the pines — warm wood, soft linen and a window onto the forest.', capacity: 'Up to 2 guests', baseGuests: 2, maxGuests: 2, extraGuestPrice: 0, order: 0 },
      { name: 'Interconnected Room', description: 'Two rooms joined by a connecting door — space for a family or friends to stay together, with privacy when you want it.', capacity: 'Up to 6 guests', baseGuests: 4, maxGuests: 6, extraGuestPrice: 0, order: 1, size: '2 rooms' },
    ];
    for (const d of defs) {
      const ex = rooms.find((r) => r.name === d.name);
      if (ex) {
        if (!ex.bookable || !ex.published) {
          say(`Room "${d.name}" made bookable online`);
          await run(() => prisma.room.update({ where: { id: ex.id }, data: { bookable: true, published: true } }));
        }
        if (ex.basePrice == null) todo.push(`Set the price of “${d.name}”: Stays → Rooms & units → ${d.name} → “Normal price per night”.`);
      } else {
        say(`Created room "${d.name}" (bookable online — set its price!)`);
        await run(() => prisma.room.create({ data: { ...d, stayId: backwood!.id, images: imgs, bookable: true, units: 1, published: true } }));
        todo.push(`Set the price of “${d.name}”: Stays → Rooms & units → ${d.name} → “Normal price per night”, and add photos.`);
      }
    }
  }

  const domes = await prisma.stay.findFirst({ where: { slug: 'domes' }, include: { rooms: { orderBy: { order: 'asc' } } } });
  if (domes) {
    const published = domes.rooms.filter((r) => r.published);
    const dome = published[0] || domes.rooms[0];
    if (dome) {
      const guess = dome.basePrice ?? priceFromText(dome.priceFrom);
      if (!dome.bookable || !dome.published || (guess && !dome.basePrice)) say(`Room "${dome.name}" is now the one bookable dome${guess && !dome.basePrice ? ` (normal price ₹${guess} taken from “${dome.priceFrom}”)` : ''}`);
      await run(() => prisma.room.update({ where: { id: dome.id }, data: { bookable: true, units: 1, published: true, ...(guess && !dome.basePrice ? { basePrice: guess } : {}) } }));
      if (!guess) todo.push(`Set the price of “${dome.name}”: Stays → Rooms & units → ${dome.name} → “Normal price per night”.`);
      todo.push(`Check “${dome.name}”: guests included in the price, maximum guests and extra-guest charge (Stays → Rooms & units).`);
      for (const r of published.slice(1)) {
        say(`Hid extra dome room "${r.name}" (you have one dome)`);
        await run(() => prisma.room.update({ where: { id: r.id }, data: { published: false, bookable: false } }));
      }
    }
  }

  // ── 2. Pages ──
  console.log('\nPages');
  const mudPage = await prisma.page.findUnique({ where: { slug: 'stays/mudhouse' } });
  const hasBackwoodPage = await prisma.page.findUnique({ where: { slug: 'stays/backwood' } });
  if (mudPage && !hasBackwoodPage) {
    say(`Page "${mudPage.title}" moved to /stays/backwood and renamed "Backwood Stays"`);
    await run(() => prisma.page.update({ where: { id: mudPage.id }, data: { slug: 'stays/backwood', title: /mudhouse/i.test(mudPage.title) ? 'Backwood Stays' : mudPage.title, seoTitle: mudPage.seoTitle ? renameText(mudPage.seoTitle) : mudPage.seoTitle, seoDescription: mudPage.seoDescription ? renameText(mudPage.seoDescription) : mudPage.seoDescription } }));
    todo.push('Rewrite the text on the Backwood Stays page (Pages → Backwood Stays) — it still has the old mudhouse wording.');
  }
  for (const slug of REMOVED_SLUGS) {
    const pg = await prisma.page.findUnique({ where: { slug } });
    if (pg) {
      say(`Deleted page "${pg.title}" (/${slug}) — visitors going there are sent to Home`);
      await run(() => prisma.page.delete({ where: { id: pg.id } }));
    }
  }
  const redirects: [string, string][] = [['/stays/mudhouse', '/stays/backwood'], ['/spa', '/'], ['/spa/wellness-retreat', '/'], ['/about/our-story', '/']];
  for (const [from, to] of redirects) await run(() => prisma.redirect.upsert({ where: { from }, update: { to, active: true }, create: { from, to, type: 301 } }));
  const aboutRedirect = await prisma.redirect.findUnique({ where: { from: '/about' } });
  if (aboutRedirect && isRemoved(aboutRedirect.to)) await run(() => prisma.redirect.update({ where: { id: aboutRedirect.id }, data: { to: '/about/awards' } }));

  // ── 3. Sections on every page ──
  console.log('\nSections');
  const pages = await prisma.page.findMany({ include: { sections: { orderBy: { order: 'asc' } } } });
  for (const pg of pages) {
    if (DRY && REMOVED_SLUGS.includes(pg.slug)) continue;
    for (const [i, sec] of pg.sections.entries()) {
      const h = (sec.data as Record<string, unknown> | null)?.heading;
      const where = `${pg.title} › section #${i + 1} ${typeof h === 'string' && h ? `“${h.slice(0, 50)}”` : `(${sec.label || sec.type})`}`;
      const hadMud = /mud ?house/i.test(JSON.stringify(sec.data));
      const linkedRemoved = /"\/(spa|about\/our-story)/.test(JSON.stringify(sec.data));
      let [data, removedLinks] = cleanJson(sec.data);
      const [draft, removedDraft] = sec.draftData ? cleanJson(sec.draftData) : [sec.draftData, 0];
      let booked = 0;
      [data, booked] = bookButtons(data);
      const changed = JSON.stringify(data) !== JSON.stringify(sec.data) || JSON.stringify(draft) !== JSON.stringify(sec.draftData);
      const d = (sec.data || {}) as Record<string, unknown>;
      const spaSection = sec.type === 'spaTreatments' || (linkedRemoved && ['split', 'ctaBand', 'featureList', 'cardGrid', 'richText'].includes(sec.type) && /spa|wellness|story|eco/i.test(`${d.eyebrow || ''} ${d.heading || ''}`));
      if (spaSection && sec.isVisible) {
        say(`Hid section ${where} (it was about the spa / eco story) — delete it in the admin if you don’t need it`);
        await run(() => prisma.section.update({ where: { id: sec.id }, data: { isVisible: false } }));
      }
      if (changed) {
        const renamed = JSON.stringify(cleanJson(sec.data)[0]) !== JSON.stringify(sec.data) && removedLinks === 0;
        const parts = [removedLinks + removedDraft ? `removed ${removedLinks + removedDraft} link(s) to deleted pages` : '', booked ? `${booked} Book button(s) → /book` : '', renamed || hadMud ? 'renamed Mudhouse → Backwood' : ''].filter(Boolean);
        say(`Updated ${where}: ${parts.join(', ')}`);
        await run(() => prisma.section.update({ where: { id: sec.id }, data: { data: data as Prisma.InputJsonValue, ...(sec.draftData ? { draftData: draft as Prisma.InputJsonValue } : {}) } }));
      }
      if (!spaSection && sec.isVisible && (mentions(data) || hadMud)) todo.push(`Rewrite the wording (it was about the mudhouse / spa): ${where} (/${pg.slug})`);
    }
  }

  // ── 4. Menus ──
  console.log('\nMenus');
  type Node = { label: string; href: string; children?: Node[] } & Record<string, unknown>;
  const fixNodes = (nodes: Node[]): Node[] =>
    nodes.flatMap((n) => {
      const kids = fixNodes(Array.isArray(n.children) ? n.children : []);
      const label = renameText(n.label).replace(/^Glamping Domes$/, 'Glamping Dome');
      if (isRemoved(n.href)) {
        if (kids.length) return [{ ...n, label, href: kids[0].href, children: kids }];
        return [];
      }
      return [{ ...n, label, href: renameText(n.href), children: kids }];
    });
  for (const m of await prisma.menu.findMany()) {
    const items = Array.isArray(m.items) ? (m.items as Node[]) : [];
    const next = fixNodes(items);
    if (JSON.stringify(next) !== JSON.stringify(items)) {
      say(`Updated ${m.location} menu (removed Spa / Wellness / Eco story links, renamed Mudhouse)`);
      await run(() => prisma.menu.update({ where: { id: m.id }, data: { items: next as unknown as Prisma.InputJsonValue } }));
    }
  }

  // ── 5. Settings ──
  console.log('\nSettings');
  const OLD_FOOTER = 'An eco-luxury hideaway of geodesic domes and a restored mudhouse, built gently into the mountainside at Cheog, Shimla.';
  const NEW_FOOTER = 'An eco-luxury hideaway with a geodesic glamping dome and cosy Backwood Stays, tucked into the forest at Cheog, Shimla.';
  for (const st of await prisma.setting.findMany()) {
    let [value] = cleanJson(st.value);
    if (st.key === 'footer' && (value as { about?: string })?.about === OLD_FOOTER) value = { ...(value as object), about: NEW_FOOTER };
    const OLD_SEO = /^Geodesic domes, a (heritage mudhouse|Backwood Stays), spa and café in the mountains of Cheog, Shimla\.$/;
    if (st.key === 'seo' && OLD_SEO.test(String((value as { defaultDescription?: string })?.defaultDescription))) value = { ...(value as object), defaultDescription: 'A geodesic glamping dome, cosy Backwood Stays and a glass café in the forests of Cheog, Shimla. Book direct.' };
    if (st.key === 'booking') {
      const v = (value || {}) as Record<string, unknown>;
      value = {
        checkInTime: '12:00 PM', checkOutTime: '11:00 AM', childFreeAge: 5, maxAdvanceDays: 365, taxNote: true, notifyEmail: '',
        policy: 'All bookings are non-refundable. Dates can be changed once, subject to availability, if you contact us at least 7 days before check-in.',
        ...v,
        mode: 'online',
      };
    }
    const sorted = (x: unknown) => JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
    if (sorted(value) !== sorted(st.value)) {
      say(st.key === 'booking' ? 'Booking: switched to online booking with payment (/book)' : `Updated “${st.key}” settings (renamed Mudhouse)`);
      await run(() => prisma.setting.update({ where: { key: st.key }, data: { value: value as Prisma.InputJsonValue } }));
    }
    if (st.key !== 'booking' && mentions(value)) todo.push(`Settings → ${st.key} still mentions mudhouse / spa — check the text.`);
  }

  // ── 6. FAQ categories ──
  let faqMoved = 0;
  for (const f of await prisma.faq.findMany()) {
    const pagesArr = Array.isArray(f.pages) ? (f.pages as string[]) : [];
    const next = pagesArr.filter((p) => !REMOVED_SLUGS.includes(p)).map((p) => (p === 'stays/mudhouse' ? 'stays/backwood' : p));
    const answer = renameText(f.answer);
    if (JSON.stringify(next) !== JSON.stringify(pagesArr) || answer !== f.answer) {
      faqMoved++;
      await run(() => prisma.faq.update({ where: { id: f.id }, data: { pages: next, answer } }));
    }
  }
  if (faqMoved) say(`Updated ${faqMoved} FAQ(s): pages they show on / Mudhouse name`);
  const spaFaqs = await prisma.faq.findMany({ where: { OR: [{ question: { contains: 'spa' } }, { question: { contains: 'Spa' } }] } });
  for (const f of spaFaqs) todo.push(`FAQ about the spa — delete or rewrite: “${f.question}” (Social proof → FAQs)`);

  // ── record in the Change Log ──
  if (!DRY && log.length)
    await prisma.activityLog.create({
      data: { userName: 'update-content script', action: 'update', entity: 'site', summary: `Content update: Backwood Stays, one dome, removed Spa / Wellness Retreat / Our Eco Story, online booking on (${log.length} changes)`, details: { note: log.join('\n') } as Prisma.InputJsonValue },
    }).catch(() => prisma.activityLog.create({ data: { userName: 'update-content script', action: 'update', entity: 'site', summary: `Content update (${log.length} changes): ${log.join(' | ').slice(0, 5000)}` } }));

  console.log(`\n${DRY ? 'Would make' : 'Made'} ${log.length} change(s).`);
  if (todo.length) {
    console.log('\nPlease check these yourself in the admin:');
    for (const t of [...new Set(todo)]) console.log(`  → ${t}`);
  }
  console.log(DRY ? '\nRun without --dry to apply.\n' : '\nDone. Restart the site (npm run dev) to see the changes.\n');
}

main()
  .catch((e) => {
    console.error('\nUpdate failed — nothing after the error was changed.', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
