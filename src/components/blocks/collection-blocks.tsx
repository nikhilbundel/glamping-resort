import Link from 'next/link';
import { ArrowRight, BedDouble, Eye, Maximize2, Quote, Star, Users, Download, Leaf } from 'lucide-react';
import { prisma } from '@/lib/db';
import { bookingLink, getInstagram } from '@/lib/data';
import { sanitize } from '@/lib/sanitize';
import { asArray, cn, formatDate, stripHtml } from '@/lib/utils';
import type { ImageValue } from '@/lib/types';
import { faqJsonLd } from '@/lib/seo';
import { Section, SectionHeading, isDark } from '@/components/ui/Section';
import { Reveal, RevealItem } from '@/components/ui/Reveal';
import { SmartImage } from '@/components/ui/SmartImage';
import { Ctas } from '@/components/ui/Button';
import { RichText } from '@/components/ui/RichText';
import { Icon } from '@/components/ui/Icon';
import { ActivitiesGrid } from './client/ActivitiesGrid';
import { LazyArrangements as Arrangements, LazyFaqBrowser as FaqBrowser } from './client/lazy';
import { Carousel, MiniSlider } from './client/Carousel';
import { Accordion } from './client/Accordion';
import type { BlockProps } from './types';

const head = (d: any, onDark?: boolean) => <SectionHeading eyebrow={d.eyebrow} heading={d.heading} intro={d.intro} align={d.align || 'center'} onDark={onDark} />;

export async function ActivitiesBlock({ data }: BlockProps) {
  const where: any = { published: true };
  if (data.filter === 'featured') where.featured = true;
  if (data.filter === 'seasonal') where.seasonal = true;
  const rows = await prisma.activity.findMany({ where, orderBy: { order: 'asc' }, take: data.limit ? Number(data.limit) : undefined });
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      <ActivitiesGrid
        showFilters={data.showFilters}
        items={rows.map((a) => ({ id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt || '', image: a.image as unknown as ImageValue, video: a.video, tags: asArray<string>(a.tags), featured: a.featured, seasonal: a.seasonal, duration: a.duration || '', price: a.price || '' }))}
      />
      <Ctas ctas={data.ctas} onDark={dark} className="mt-12 justify-center" />
    </Section>
  );
}

export async function SpecialArrangementsBlock({ data, ctx }: BlockProps) {
  const rows = await prisma.specialArrangement.findMany({ where: { published: true }, orderBy: { order: 'asc' }, take: data.limit ? Number(data.limit) : undefined });
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      <Arrangements
        booking={bookingLink(ctx.settings)}
        items={rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug, excerpt: r.excerpt || '', price: r.price || '', image: r.image as unknown as ImageValue, html: sanitize(r.content) }))}
      />
      <Ctas ctas={data.ctas} onDark={dark} className="mt-12 justify-center" />
    </Section>
  );
}

export async function StaysGridBlock({ data }: BlockProps) {
  const stays = await prisma.stay.findMany({ where: { published: true }, orderBy: { order: 'asc' } });
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      <Reveal as="ul" className="grid gap-8 md:grid-cols-2">
        {stays.map((s) => (
          <RevealItem as="li" key={s.id}>
            <Link href={`/${s.pageSlug || `stays/${s.slug}`}`} className="group relative block aspect-[4/3] overflow-hidden rounded-card text-white">
              <SmartImage image={s.image as unknown as ImageValue} sizes="(min-width:768px) 50vw, 100vw" className="transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-7">
                {s.eyebrow && <span className="eyebrow block text-white/80">{s.eyebrow}</span>}
                <span className="mt-2 block font-heading text-h3 font-semibold">{s.name}</span>
                {s.summary && <span className="mt-2 block max-w-md text-sm text-white/85">{s.summary}</span>}
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
                  Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </span>
            </Link>
          </RevealItem>
        ))}
      </Reveal>
    </Section>
  );
}

export async function RoomsBlock({ data, ctx }: BlockProps) {
  if (!data.stayId) return null;
  const rooms = await prisma.room.findMany({ where: { stayId: data.stayId, published: true }, orderBy: { order: 'asc' } });
  const book = bookingLink(ctx.settings);
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      <ul className="grid gap-8 lg:grid-cols-2 [&>*]:min-w-0">
        {rooms.map((r) => {
          const imgs = asArray<ImageValue>(r.images);
          const href = r.bookUrl || (r.bookable ? bookingLink(ctx.settings, r.id).href : book.href);
          const from = r.priceFrom || (r.bookable && r.basePrice ? `₹${r.basePrice.toLocaleString('en-IN')} / night` : '');
          return (
            <li key={r.id} className="card flex flex-col text-ink">
              <div className="relative aspect-[16/10] overflow-hidden">
                {imgs.length > 1 ? (
                  <MiniSlider label={`${r.name} photos`}>
                    {imgs.map((img, i) => (
                      <div key={i} className="relative h-full w-full">
                        <SmartImage image={img} sizes="(min-width:1024px) 50vw, 100vw" loading="lazy" />
                      </div>
                    ))}
                  </MiniSlider>
                ) : (
                  <SmartImage image={imgs[0]} sizes="(min-width:1024px) 50vw, 100vw" loading="lazy" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-heading text-h3 font-semibold">{r.name}</h3>
                  <p className="text-right text-sm">
                    {r.priceOnRequest ? <span className="text-muted">Price on request</span> : from ? (<><span className="text-muted">From </span><span className="font-medium text-accent">{from}</span></>) : null}
                  </p>
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                  {r.size && <li className="inline-flex items-center gap-1.5"><Maximize2 className="h-4 w-4" aria-hidden="true" />{r.size}</li>}
                  {r.view && <li className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4" aria-hidden="true" />{r.view}</li>}
                  {r.capacity && <li className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden="true" />{r.capacity}</li>}
                </ul>
                {r.description && <p className="mt-4 text-muted">{r.description}</p>}
                {!!asArray(r.features).length && (
                  <ul className="mt-5 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
                    {asArray<{ icon?: string; label: string }>(r.features).map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <Icon name={f.icon || 'Check'} className="h-4 w-4 shrink-0 text-accent" />
                        {f.label}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto pt-7">
                  <a href={href} target={/^https?:/.test(href) ? '_blank' : undefined} rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center gap-2 rounded-btn bg-btn px-7 text-sm font-medium text-btn-ink transition hover:-translate-y-0.5 hover:shadow-lift">
                    <BedDouble className="h-4 w-4" aria-hidden="true" /> {book.label}
                    <span className="sr-only"> — {r.name}</span>
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export async function AmenitiesBlock({ data }: BlockProps) {
  const rows = await prisma.amenity.findMany({ where: { published: true, ...(data.group ? { group: data.group } : {}) }, orderBy: { order: 'asc' } });
  const dark = isDark(data.background);
  const card = (a: (typeof rows)[number]) => (
    <div key={a.id} className={cn('h-full rounded-card p-7 text-center', dark ? 'bg-white/5' : 'bg-surface shadow-soft')}>
      <span className={cn('mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full', dark ? 'bg-white/10' : 'bg-primary/10 text-primary')}>
        <Icon name={a.icon} className="h-6 w-6" />
      </span>
      <h3 className="mt-5 font-heading text-xl font-semibold">{a.title}</h3>
      {a.text && <p className={cn('mt-2 text-sm', dark ? 'text-white/75' : 'text-muted')}>{a.text}</p>}
    </div>
  );
  return (
    <Section data={data}>
      {head(data, dark)}
      {data.layout === 'grid' ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{rows.map(card)}</div> : <Carousel perView={4} onDark={dark}>{rows.map(card)}</Carousel>}
    </Section>
  );
}

export async function AwardsBlock({ data }: BlockProps) {
  const rows = await prisma.award.findMany({ where: { published: true }, orderBy: { order: 'asc' } });
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      {data.style === 'cards' ? (
        <Reveal as="ul" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => (
            <RevealItem as="li" key={a.id} className="card flex flex-col items-center p-8 text-center text-ink">
              <div className="relative h-28 w-28">
                <SmartImage image={a.image as unknown as ImageValue} sizes="112px" className="!object-contain" loading="lazy" />
              </div>
              {a.year && <p className="eyebrow mt-5 text-accent">{a.year}</p>}
              <h3 className="mt-2 font-heading text-h3 font-semibold">{a.title}</h3>
              {a.issuer && <p className="mt-1 text-sm text-muted">{a.issuer}</p>}
              {a.description && <p className="mt-3 text-muted">{a.description}</p>}
              {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-4 text-sm text-accent underline-offset-4 hover:underline">View award</a>}
            </RevealItem>
          ))}
        </Reveal>
      ) : (
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {rows.map((a) => (
            <li key={a.id} className="relative h-24 w-32 opacity-90 transition hover:opacity-100 md:h-28 md:w-36" title={`${a.title}${a.year ? ` (${a.year})` : ''}`}>
              <SmartImage image={a.image as unknown as ImageValue} sizes="144px" className="!object-contain" loading="lazy" />
            </li>
          ))}
        </ul>
      )}
      <Ctas ctas={data.ctas} onDark={dark} className="mt-12 justify-center" />
    </Section>
  );
}

export async function TeamBlock({ data }: BlockProps) {
  const rows = await prisma.teamMember.findMany({ where: { published: true }, orderBy: { order: 'asc' } });
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      <Reveal as="ul" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((m) => (
          <RevealItem as="li" key={m.id} className="text-center">
            <div className="relative mx-auto aspect-[4/5] overflow-hidden rounded-card">
              <SmartImage image={m.photo as unknown as ImageValue} sizes="(min-width:1024px) 25vw, 50vw" loading="lazy" />
            </div>
            <h3 className="mt-5 font-heading text-h3 font-semibold">{m.name}</h3>
            {m.role && <p className="eyebrow mt-1 text-accent">{m.role}</p>}
            {m.bio && <p className={cn('mt-3 text-sm', dark ? 'text-white/75' : 'text-muted')}>{m.bio}</p>}
          </RevealItem>
        ))}
      </Reveal>
    </Section>
  );
}

export async function SpaTreatmentsBlock({ data }: BlockProps) {
  const rows = await prisma.spaTreatment.findMany({ where: { published: true, ...(data.category ? { category: data.category } : {}) }, orderBy: { order: 'asc' } });
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      <ul className="mx-auto max-w-4xl divide-y divide-line rounded-card bg-surface px-6 text-ink shadow-soft md:px-10">
        {rows.map((t) => (
          <li key={t.id} className="flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
            <div>
              <h3 className="font-heading text-xl font-semibold">{t.name}</h3>
              {t.description && <p className="mt-1 text-sm text-muted">{t.description}</p>}
            </div>
            <p className="shrink-0 text-sm sm:text-right">
              {t.duration && <span className="text-muted">{t.duration}</span>}
              {t.duration && t.price && <span className="mx-2 text-line">|</span>}
              {t.price && <span className="font-medium text-accent">{t.price}</span>}
            </p>
          </li>
        ))}
      </ul>
      {data.note && <RichText html={data.note} onDark={dark} className="mx-auto mt-8 max-w-4xl text-center" />}
    </Section>
  );
}

export async function CafeTimingsBlock({ data }: BlockProps) {
  const rows = await prisma.cafeTiming.findMany({ where: { published: true }, orderBy: { order: 'asc' } });
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      <div className="mx-auto max-w-3xl overflow-x-auto rounded-card bg-surface text-ink shadow-soft">
        <table className="w-full min-w-[420px] text-left">
          <caption className="sr-only">Café timings</caption>
          <thead className="bg-primary text-white">
            <tr>
              {['Meal', 'Hours', 'Last order'].map((h) => (
                <th key={h} scope="col" className="px-6 py-4 text-sm font-medium uppercase tracking-[0.12em]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="even:bg-bg/60">
                <th scope="row" className="px-6 py-4 font-medium">{r.meal}</th>
                <td className="px-6 py-4 text-ink/80">{r.hours}</td>
                <td className="px-6 py-4 text-ink/80">{r.lastOrder || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.note && <p className={cn('mx-auto mt-4 max-w-3xl text-center text-sm', dark ? 'text-white/70' : 'text-muted')}>{data.note}</p>}
    </Section>
  );
}

export async function CafeMenuBlock({ data }: BlockProps) {
  const cats = await prisma.menuCategory.findMany({ where: { published: true }, orderBy: { order: 'asc' }, include: { items: { where: { published: true }, orderBy: { order: 'asc' } } } });
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      {data.pdf && (
        <div className="-mt-6 mb-12 flex justify-center">
          <a href={data.pdf} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center gap-2 rounded-btn border border-current px-6 text-sm font-medium transition hover:bg-ink/5">
            <Download className="h-4 w-4" aria-hidden="true" /> {data.pdfLabel || 'Download menu (PDF)'}
          </a>
        </div>
      )}
      <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
        {cats.map((c) => (
          <div key={c.id}>
            <h3 className="border-b border-current/20 pb-3 font-heading text-h3 font-semibold">{c.name}</h3>
            {c.description && <p className={cn('mt-2 text-sm', dark ? 'text-white/70' : 'text-muted')}>{c.description}</p>}
            <ul className="mt-4 space-y-5">
              {c.items.map((i) => (
                <li key={i.id}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-medium">{i.name}</span>
                    {i.vegan ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-700/10 px-2 py-0.5 text-[11px] font-medium text-green-800" title="Vegan"><Leaf className="h-3 w-3" aria-hidden="true" />Vegan</span>
                    ) : i.veg ? (
                      <span className="inline-flex items-center gap-1 rounded-sm border border-green-700 px-1 text-[10px] font-semibold uppercase text-green-800" title="Vegetarian">Veg</span>
                    ) : (
                      <span className="inline-flex items-center rounded-sm border border-red-700 px-1 text-[10px] font-semibold uppercase text-red-800" title="Non-vegetarian">Non-veg</span>
                    )}
                    <span className="flex-1 border-b border-dotted border-current/30" aria-hidden="true" />
                    {i.price && <span className="font-medium text-accent">{i.price}</span>}
                  </div>
                  {i.description && <p className={cn('mt-1 text-sm', dark ? 'text-white/70' : 'text-muted')}>{i.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

export async function LatestPostsBlock({ data }: BlockProps) {
  const posts = await prisma.post.findMany({ where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } }, orderBy: { publishedAt: 'desc' }, take: Number(data.count || 3), include: { category: true } });
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      <PostCards posts={posts} />
      <Ctas ctas={data.ctas} onDark={dark} className="mt-12 justify-center" />
    </Section>
  );
}

export function PostCards({ posts }: { posts: { id: string; slug: string; title: string; excerpt: string | null; coverImage: unknown; publishedAt: Date | null; readingTime: number; category: { name: string } | null }[] }) {
  return (
    <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <li key={p.id} className="card group flex flex-col text-ink">
          <Link href={`/blog/${p.slug}`} className="relative block aspect-[16/10] overflow-hidden" tabIndex={-1} aria-hidden="true">
            <SmartImage image={p.coverImage as ImageValue} sizes="(min-width:1024px) 33vw, 50vw" className="transition-transform duration-700 group-hover:scale-105" loading="lazy" />
          </Link>
          <div className="flex flex-1 flex-col p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-muted">
              {p.category?.name && <span className="text-accent">{p.category.name} · </span>}
              <time dateTime={p.publishedAt?.toISOString()}>{formatDate(p.publishedAt)}</time> · {p.readingTime} min read
            </p>
            <h3 className="mt-3 font-heading text-h3 font-semibold leading-snug">
              <Link href={`/blog/${p.slug}`} className="hover:text-accent">{p.title}</Link>
            </h3>
            {p.excerpt && <p className="mt-3 line-clamp-3 text-muted">{p.excerpt}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export async function TestimonialsBlock({ data }: BlockProps) {
  const [rows, mentions] = await Promise.all([
    prisma.testimonial.findMany({ where: { published: true }, orderBy: { order: 'asc' } }),
    data.showMentions ? prisma.mediaMention.findMany({ where: { published: true }, orderBy: { order: 'asc' } }) : Promise.resolve([]),
  ]);
  const dark = isDark(data.background);
  const photos = asArray<ImageValue>(data.communityPhotos);
  return (
    <Section data={data}>
      {head(data, dark)}
      <Carousel perView={2} onDark={dark} autoplay={8}>
        {rows.map((t) => (
          <figure key={t.id} className={cn('flex h-full flex-col rounded-card p-8 md:p-10', dark ? 'bg-white/5' : 'bg-surface shadow-soft')}>
            <Quote className="h-8 w-8 text-accent" aria-hidden="true" />
            <div className="mt-3 flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn('h-4 w-4', i < t.rating ? 'fill-accent text-accent' : 'text-line')} aria-hidden="true" />
              ))}
            </div>
            <blockquote className="mt-5 flex-1 font-heading text-xl leading-relaxed md:text-2xl">“{t.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-4">
              {(t.avatar as any)?.url && (
                <span className="relative h-12 w-12 overflow-hidden rounded-full">
                  <SmartImage image={t.avatar as unknown as ImageValue} sizes="48px" loading="lazy" />
                </span>
              )}
              <span>
                <span className="block font-medium">{t.name}</span>
                <span className={cn('text-sm', dark ? 'text-white/60' : 'text-muted')}>{[t.location, t.source].filter(Boolean).join(' · ')}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </Carousel>
      {!!mentions.length && <MentionsMarquee heading={data.mentionsHeading} mentions={mentions} dark={dark} />}
      {!!photos.length && (
        <div className="mt-20">
          {data.communityHeading && <p className="eyebrow mb-6 text-center text-accent">{data.communityHeading}</p>}
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {photos.map((p, i) => (
              <li key={i} className="relative aspect-square overflow-hidden rounded-card">
                <SmartImage image={p} sizes="(min-width:1024px) 16vw, 50vw" loading="lazy" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function MentionsMarquee({ heading, mentions, dark }: { heading?: string; mentions: { id: string; name: string; logo: unknown; url: string | null }[]; dark?: boolean }) {
  const doubled = [...mentions, ...mentions];
  return (
    <div className="mt-20">
      {heading && <p className={cn('eyebrow mb-8 text-center', dark ? 'text-white/70' : 'text-muted')}>{heading}</p>}
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <ul className="flex w-max animate-marquee items-center gap-16 hover:[animation-play-state:paused]">
          {doubled.map((m, i) => (
            <li key={`${m.id}-${i}`} aria-hidden={i >= mentions.length} className="relative h-12 w-36 shrink-0 opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0">
              {m.url ? (
                <a href={m.url} target="_blank" rel="noopener noreferrer" tabIndex={i >= mentions.length ? -1 : 0} aria-label={m.name}>
                  <SmartImage image={m.logo as ImageValue} sizes="144px" className="!object-contain" loading="lazy" />
                </a>
              ) : (
                <SmartImage image={m.logo as ImageValue} sizes="144px" className="!object-contain" loading="lazy" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export async function MediaMentionsBlock({ data }: BlockProps) {
  const mentions = await prisma.mediaMention.findMany({ where: { published: true }, orderBy: { order: 'asc' } });
  const dark = isDark(data.background);
  return (
    <Section data={data} className="!py-16">
      {data.eyebrow || data.heading ? <SectionHeading eyebrow={data.eyebrow} heading={data.heading} onDark={dark} className="!mb-0" /> : null}
      <MentionsMarquee mentions={mentions} dark={dark} />
    </Section>
  );
}

export async function InstagramBlock({ data, ctx }: BlockProps) {
  const items = await getInstagram(Number(data.count || 6));
  const s = ctx.settings.instagram;
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      <SectionHeading eyebrow={data.eyebrow || (s.handle ? `@${s.handle}` : '')} heading={data.heading} onDark={dark} />
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((p) => (
          <li key={p.id}>
            <a href={p.link} target="_blank" rel="noopener noreferrer" className="group relative block aspect-square overflow-hidden rounded-card" aria-label={p.caption ? `Instagram: ${p.caption.slice(0, 80)}` : 'Open Instagram post'}>
              <SmartImage image={p.image} sizes="(min-width:1024px) 16vw, (min-width:640px) 33vw, 50vw" className="transition-transform duration-700 group-hover:scale-110" loading="lazy" />
              <span className="absolute inset-0 bg-primary/0 transition group-hover:bg-primary/30" />
            </a>
          </li>
        ))}
      </ul>
      {s.profileUrl && (
        <div className="mt-10 flex justify-center">
          <Ctas onDark={dark} ctas={[{ label: data.buttonLabel || 'Follow on Instagram', href: s.profileUrl, style: 'secondary', newTab: true }]} />
        </div>
      )}
    </Section>
  );
}

export async function FaqBlock({ data, ctx }: BlockProps) {
  const where: any = { published: true };
  if (data.mode === 'category' && data.categoryId) where.categoryId = data.categoryId;
  let faqs = await prisma.faq.findMany({ where, orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }] });
  if (data.mode === 'page' || !data.mode) faqs = faqs.filter((f) => asArray<string>(f.pages).includes(ctx.pageSlug));
  if (data.limit) faqs = faqs.slice(0, Number(data.limit));
  if (!faqs.length) return null;
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      <div className="mx-auto max-w-3xl">
        <Accordion onDark={dark} items={faqs.map((f) => ({ id: f.id, title: f.question, content: <RichText html={f.answer} onDark={dark} /> }))} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs.map((f) => ({ question: f.question, answer: stripHtml(f.answer) })))) }} />
    </Section>
  );
}

export async function FaqBrowserBlock({ data }: BlockProps) {
  const cats = await prisma.faqCategory.findMany({ orderBy: { order: 'asc' }, include: { faqs: { where: { published: true }, orderBy: { order: 'asc' } } } });
  const dark = isDark(data.background);
  const all = cats.flatMap((c) => c.faqs);
  return (
    <Section data={data}>
      {head(data, dark)}
      <FaqBrowser
        placeholder={data.searchPlaceholder}
        categories={cats.filter((c) => c.faqs.length).map((c) => ({ id: c.id, name: c.name, faqs: c.faqs.map((f) => ({ id: f.id, question: f.question, html: sanitize(f.answer), text: stripHtml(f.answer) })) }))}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(all.map((f) => ({ question: f.question, answer: stripHtml(f.answer) })))) }} />
    </Section>
  );
}

