import type { VideoReview } from './client/VideoReviews';
import { Check } from 'lucide-react';
import { Section, SectionHeading, Eyebrow, isDark, textSizeVars } from '@/components/ui/Section';
import { Reveal, RevealItem } from '@/components/ui/Reveal';
import { RichText } from '@/components/ui/RichText';
import { SmartImage } from '@/components/ui/SmartImage';
import { Ctas, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { HeroSlider } from './client/HeroSlider';
import { LazyGallery as Gallery, LazyThumbStrip as ThumbStrip, LazyVideoEmbed as VideoEmbed, LazyVideoReviews as VideoReviews } from './client/lazy';
import { Counter } from './client/Counter';
import { Carousel, MiniSlider } from './client/Carousel';
import { prisma } from '@/lib/db';
import { heroFontHref } from '@/lib/hero-options';
import { cn, asArray } from '@/lib/utils';
import type { ImageValue } from '@/lib/types';
import type { BlockProps } from './types';

const head = (d: any, onDark?: boolean) => <SectionHeading eyebrow={d.eyebrow} heading={d.heading} intro={d.intro} align={d.align || 'center'} onDark={onDark} />;
const COLS: Record<string, string> = { '2': 'sm:grid-cols-2', '3': 'sm:grid-cols-2 lg:grid-cols-3', '4': 'sm:grid-cols-2 lg:grid-cols-4' };

export function HeroBlock({ data, ctx }: BlockProps) {
  const slides = asArray<any>(data.slides);
  const slides2 = asArray<any>(data.slides2);
  if (!slides.length && !slides2.length) return null;
  const fontHref = heroFontHref(data.fontFamily);
  return (
    <>
    {fontHref && <link rel="stylesheet" href={fontHref} />}
    <HeroSlider
      sets={[
        { label: data.tab1Label || 'Stays', slides },
        { label: data.tab2Label || 'Experiences', slides: slides2 },
      ]}
      showTabs={!!data.showTabs}
      top={{ image: data.topImage, width: data.topImageWidth, mobileWidth: data.topImageMobileWidth, offset: data.topOffset, gap: data.topGap }}
      height={data.height || 'full'}
      overlay={data.overlay ?? 40}
      autoplay={data.autoplay ?? 6}
      kenBurns={data.kenBurns ?? true}
      showScrollCue={data.showScrollCue}
      firstIsH1={ctx.firstIsH1}
      homeLink={ctx.firstIsH1 && ctx.pageSlug !== '' && data.homeLink !== 'hide' ? String(data.homeLinkLabel || 'Home') : null}
      text={{
        textAlign: data.textAlign || (data.align === 'left' || data.align === 'bottom-left' ? 'left' : 'center'),
        verticalAlign: data.verticalAlign || (data.align === 'bottom-left' ? 'bottom' : 'center'),
        fontSize: data.fontSize,
        mobileFontSize: data.mobileFontSize,
        fontWeight: data.fontWeight,
        fontFamily: data.fontFamily,
        textColor: data.textColor,
        maxWidth: data.maxWidth,
        lineHeight: data.lineHeight,
        letterSpacing: data.letterSpacing,
        uppercase: data.uppercase,
        italic: data.italic,
        textShadow: data.textShadow,
        textEffect: data.textEffect,
        offsetX: data.offsetX,
        offsetY: data.offsetY,
        mobileOffsetX: data.mobileOffsetX,
        mobileOffsetY: data.mobileOffsetY,
        textColor2: data.textColor2,
        outlineWidth: data.outlineWidth,
      }}
      anim={{
        animation: data.animation || 'fade-up',
        easing: data.animEasing,
        duration: data.animDuration,
        delay: data.animDelay,
        stagger: data.animStagger,
        distance: data.animDistance,
        repeat: data.animRepeat,
        repeatGap: data.animRepeatGap,
        fadeOut: data.animFadeOut,
      }}
    />
    </>
  );
}

export function SplitBlock({ data }: BlockProps) {
  const dark = isDark(data.background);
  const gallery = asArray<ImageValue>(data.gallery);
  const imageLeft = data.imagePosition === 'left';
  const media = data.media || 'image';
  return (
    <Section data={data}>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20 [&>*]:min-w-0">
        <Reveal className={cn('min-w-0', imageLeft ? 'lg:order-2' : 'lg:order-1')}>
          <RevealItem>
            <Eyebrow onDark={dark}>{data.eyebrow}</Eyebrow>
          </RevealItem>
          {data.heading && (
            <RevealItem>
              <h2 className="font-heading text-h2 font-semibold">{data.heading}</h2>
            </RevealItem>
          )}
          <RevealItem>
            <RichText html={data.body} onDark={dark} className="mt-6" />
          </RevealItem>
          {!!asArray(data.bullets).length && (
            <RevealItem>
              <ul className="mt-6 space-y-3">
                {asArray<string>(data.bullets).map((b, i) => (
                  <li key={i} className="flex gap-3">
                    <Check className={cn('mt-1 h-5 w-5 shrink-0', dark ? 'text-white' : 'text-accent')} aria-hidden="true" />
                    <span className={dark ? 'text-white/85' : 'text-ink/80'}>{b}</span>
                  </li>
                ))}
              </ul>
            </RevealItem>
          )}
          <RevealItem>
            <Ctas ctas={data.ctas} onDark={dark} className="mt-9" />
          </RevealItem>
        </Reveal>

        <Reveal className={cn('min-w-0', imageLeft ? 'lg:order-1' : 'lg:order-2')}>
          <RevealItem>
            {media === 'two' ? (
              <div className="grid grid-cols-5 gap-4">
                <div className="relative col-span-3 aspect-[3/4] overflow-hidden rounded-card">
                  <SmartImage image={data.image} sizes="(min-width:1024px) 30vw, 60vw" loading="lazy" />
                </div>
                <div className="relative col-span-2 mt-16 aspect-[3/4] overflow-hidden rounded-card">
                  <SmartImage image={gallery[0]} sizes="(min-width:1024px) 20vw, 40vw" loading="lazy" />
                </div>
              </div>
            ) : media === 'slider' && gallery.length ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-card">
                <MiniSlider label={data.heading || 'Gallery'} autoplay={data.sliderAutoplay === undefined || data.sliderAutoplay === '' ? 5 : Number(data.sliderAutoplay)}>
                  {[data.image, ...gallery].filter(Boolean).map((img: ImageValue, i: number) => (
                    <div key={i} className="relative h-full w-full">
                      <SmartImage image={img} sizes="(min-width:1024px) 50vw, 100vw" loading={i === 0 ? undefined : 'lazy'} />
                    </div>
                  ))}
                </MiniSlider>
              </div>
            ) : (
              <>
                <div className="relative aspect-[4/3] overflow-hidden rounded-card shadow-soft">
                  <SmartImage image={data.image} sizes="(min-width:1024px) 50vw, 100vw" loading="lazy" />
                </div>
                {media === 'gallery' && <ThumbStrip images={gallery} />}
              </>
            )}
          </RevealItem>
        </Reveal>
      </div>
    </Section>
  );
}

export function CtaBandBlock({ data }: BlockProps) {
  const images = asArray<ImageValue>(data.images);
  if (data.layout === 'background') {
    return (
      <section id={data.anchorId || undefined} style={textSizeVars(data)} className="relative overflow-hidden py-28 text-white md:py-40">
        <SmartImage image={data.backgroundImage} sizes="100vw" loading="lazy" />
        <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
        <Reveal className="container relative text-center">
          <RevealItem>
            <Eyebrow onDark>{data.eyebrow}</Eyebrow>
          </RevealItem>
          <RevealItem>
            <h2 className="mx-auto max-w-3xl font-heading text-h2 font-semibold">{data.heading}</h2>
          </RevealItem>
          {data.text && (
            <RevealItem>
              <p className="mx-auto mt-5 max-w-2xl text-white/85">{data.text}</p>
            </RevealItem>
          )}
          <RevealItem>
            <Ctas ctas={data.ctas} onDark className="mt-9 justify-center" />
          </RevealItem>
        </Reveal>
      </section>
    );
  }
  const dark = data.background ? isDark(data.background) : true;
  return (
    <Section data={{ ...data, background: data.background || 'green' }}>
      <div className={cn('grid items-center gap-12', data.layout === 'images' && images.length > 0 && 'lg:grid-cols-2')}>
        <Reveal className={cn(data.layout !== 'images' && 'mx-auto max-w-3xl text-center')}>
          <RevealItem>
            <Eyebrow onDark={dark}>{data.eyebrow}</Eyebrow>
          </RevealItem>
          <RevealItem>
            <h2 className="font-heading text-h2 font-semibold">{data.heading}</h2>
          </RevealItem>
          {data.text && (
            <RevealItem>
              <p className={cn('mt-5', dark ? 'text-white/85' : 'text-muted')}>{data.text}</p>
            </RevealItem>
          )}
          <RevealItem>
            <Ctas ctas={data.ctas} onDark={dark} className={cn('mt-9', data.layout !== 'images' && 'justify-center')} />
          </RevealItem>
        </Reveal>
        {data.layout === 'images' && !!images.length && (
          <div className="grid grid-cols-2 gap-4">
            {images.slice(0, 2).map((img, i) => (
              <div key={i} className={cn('relative aspect-[3/4] overflow-hidden rounded-card', i === 1 && 'mt-12')}>
                <SmartImage image={img} sizes="(min-width:1024px) 25vw, 50vw" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

export function RichTextBlock({ data }: BlockProps) {
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      <div className={cn('mx-auto', data.width === 'wide' ? 'max-w-5xl' : 'max-w-3xl')}>
        {(data.eyebrow || data.heading) && <SectionHeading eyebrow={data.eyebrow} heading={data.heading} align="left" onDark={dark} className="mb-8 md:mb-10" />}
        <RichText html={data.content} onDark={dark} className="prose-lg" />
      </div>
    </Section>
  );
}

export function FeatureListBlock({ data }: BlockProps) {
  const dark = isDark(data.background);
  const items = asArray<any>(data.items);
  const card = (it: any, i: number) => (
    <div key={i} className={cn('h-full rounded-card p-7', dark ? 'bg-white/5' : 'bg-surface shadow-soft')}>
      <span className={cn('inline-flex h-12 w-12 items-center justify-center rounded-full', dark ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary')}>
        <Icon name={it.icon} className="h-6 w-6" />
      </span>
      <h3 className="mt-5 font-heading text-h3 font-semibold">{it.title}</h3>
      {it.text && <p className={cn('mt-2', dark ? 'text-white/75' : 'text-muted')}>{it.text}</p>}
    </div>
  );

  if (data.layout === 'checklist') {
    return (
      <Section data={data}>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20 [&>*]:min-w-0">
          <div>
            <SectionHeading eyebrow={data.eyebrow} heading={data.heading} intro={data.intro} align="left" onDark={dark} className="mb-8 md:mb-10" />
            <ul className="grid gap-4 sm:grid-cols-2">
              {items.map((it, i) => (
                <li key={i} className="flex gap-3">
                  <Icon name={it.icon || 'Check'} className={cn('mt-0.5 h-5 w-5 shrink-0', dark ? 'text-white' : 'text-accent')} />
                  <span>
                    <span className="font-medium">{it.title}</span>
                    {it.text && <span className={cn('block text-sm', dark ? 'text-white/70' : 'text-muted')}>{it.text}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <Ctas ctas={data.ctas} onDark={dark} className="mt-9" />
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-card">
            <SmartImage image={data.image} sizes="(min-width:1024px) 50vw, 100vw" loading="lazy" />
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section data={data}>
      {head(data, dark)}
      {data.layout === 'carousel' ? (
        <Carousel perView={Number(data.columns || 3)} onDark={dark}>
          {items.map(card)}
        </Carousel>
      ) : data.layout === 'tiles' ? (
        <Reveal as="ul" className={cn('grid gap-px overflow-hidden rounded-card', dark ? 'bg-white/10' : 'bg-line', COLS[data.columns || '4'])}>
          {items.map((it, i) => (
            <RevealItem as="li" key={i} className={cn('p-8 text-center', dark ? 'bg-primary' : 'bg-surface')}>
              <Icon name={it.icon} className={cn('mx-auto h-8 w-8', dark ? 'text-white' : 'text-accent')} />
              <h3 className="mt-4 font-heading text-h3 font-semibold">{it.title}</h3>
              {it.text && <p className={cn('mt-2 text-sm', dark ? 'text-white/75' : 'text-muted')}>{it.text}</p>}
            </RevealItem>
          ))}
        </Reveal>
      ) : (
        <Reveal as="ul" className={cn('grid gap-6', COLS[data.columns || '3'])}>
          {items.map((it, i) => (
            <RevealItem as="li" key={i}>
              {card(it, i)}
            </RevealItem>
          ))}
        </Reveal>
      )}
      <Ctas ctas={data.ctas} onDark={dark} className="mt-12 justify-center" />
    </Section>
  );
}

export function CardGridBlock({ data }: BlockProps) {
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      <Reveal as="ul" className={cn('grid gap-6', COLS[data.columns || '3'])}>
        {asArray<any>(data.cards).map((c, i) => (
          <RevealItem as="li" key={i} className="card group flex flex-col text-ink">
            {c.image?.url && (
              <div className="relative aspect-[4/3] overflow-hidden">
                <SmartImage image={c.image} sizes="(min-width:1024px) 33vw, 50vw" className="transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                {c.tag && <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">{c.tag}</span>}
              </div>
            )}
            <div className="flex flex-1 flex-col p-6 md:p-7">
              {!c.image?.url && c.tag && <span className="eyebrow mb-2 text-accent">{c.tag}</span>}
              <h3 className="font-heading text-h3 font-semibold">{c.title}</h3>
              {c.price && <p className="mt-1 font-medium text-accent">{c.price}</p>}
              {c.text && <p className="mt-3 text-muted">{c.text}</p>}
              {!!asArray(c.features).length && (
                <ul className="mt-4 space-y-2 text-sm">
                  {asArray<string>(c.features).map((f, j) => (
                    <li key={j} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto pt-6">{c.cta && <ButtonLink cta={{ ...c.cta, style: c.cta.style || 'link' }} />}</div>
            </div>
          </RevealItem>
        ))}
      </Reveal>
      <Ctas ctas={data.ctas} onDark={dark} className="mt-12 justify-center" />
    </Section>
  );
}

export async function StatsBlock({ data }: BlockProps) {
  const dark = isDark(data.background);
  let items = asArray<any>(data.items);
  if (data.source === 'collection') {
    const rows = await prisma.stat.findMany({ where: { published: true, ...(data.group ? { group: data.group } : {}) }, orderBy: { order: 'asc' } });
    items = rows.map((r) => ({ value: r.value, suffix: r.suffix, label: r.label }));
  }
  const hasImage = !!data.image?.url;
  return (
    <Section data={data}>
      <div className={cn('grid items-center gap-12 lg:gap-20 [&>*]:min-w-0', hasImage && 'lg:grid-cols-2')}>
        {hasImage && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-card">
            <SmartImage image={data.image} sizes="(min-width:1024px) 50vw, 100vw" loading="lazy" />
          </div>
        )}
        <div className={cn(!hasImage && 'mx-auto max-w-4xl text-center')}>
          <Eyebrow onDark={dark}>{data.eyebrow}</Eyebrow>
          {data.heading && <h2 className="font-heading text-h2 font-semibold">{data.heading}</h2>}
          <RichText html={data.body} onDark={dark} className={cn('mt-6', !hasImage && 'mx-auto')} />
          <dl className={cn('mt-10 grid grid-cols-2 gap-8', !hasImage && 'md:grid-cols-4')}>
            {items.map((s, i) => (
              <div key={i} className="flex flex-col-reverse">
                <dt className={cn('mt-1 text-sm uppercase tracking-[0.15em]', dark ? 'text-white/70' : 'text-muted')}>{s.label}</dt>
                <dd className={cn('font-heading text-5xl font-semibold md:text-6xl', dark ? 'text-white' : 'text-primary')}>
                  <Counter value={Number(s.value) || 0} suffix={s.suffix} />
                </dd>
              </div>
            ))}
          </dl>
          <Ctas ctas={data.ctas} onDark={dark} className={cn('mt-10', !hasImage && 'justify-center')} />
        </div>
      </div>
    </Section>
  );
}

export function TimelineBlock({ data }: BlockProps) {
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      <ol className={cn('relative mx-auto max-w-4xl border-l pl-8 md:pl-12', dark ? 'border-white/20' : 'border-line')}>
        {asArray<any>(data.items).map((it, i) => (
          <li key={i} className="relative pb-12 last:pb-0">
            <span className="absolute -left-[41px] top-1 h-4 w-4 rounded-full border-4 border-bg bg-accent md:-left-[57px]" aria-hidden="true" />
            <p className="eyebrow text-accent">{it.year}</p>
            <h3 className="mt-2 font-heading text-h3 font-semibold">{it.title}</h3>
            {it.text && <p className={cn('mt-2', dark ? 'text-white/75' : 'text-muted')}>{it.text}</p>}
            {it.image?.url && (
              <div className="relative mt-5 aspect-[16/9] max-w-xl overflow-hidden rounded-card">
                <SmartImage image={it.image} sizes="600px" loading="lazy" />
              </div>
            )}
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function TableBlock({ data }: BlockProps) {
  const dark = isDark(data.background);
  const cols = asArray<string>(data.columns);
  return (
    <Section data={data}>
      {head(data, dark)}
      <div className="mx-auto max-w-4xl overflow-x-auto rounded-card bg-surface text-ink shadow-soft">
        <table className="w-full min-w-[480px] text-left">
          {!!cols.length && (
            <thead className="bg-primary text-white">
              <tr>
                {cols.map((c, i) => (
                  <th key={i} scope="col" className="px-6 py-4 text-sm font-medium uppercase tracking-[0.12em]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-line">
            {asArray<any>(data.rows).map((r, i) => (
              <tr key={i} className="even:bg-bg/60">
                {asArray<string>(r.cells).map((c, j) =>
                  j === 0 ? (
                    <th key={j} scope="row" className="px-6 py-4 font-medium">
                      {c}
                    </th>
                  ) : (
                    <td key={j} className="px-6 py-4 text-ink/80">
                      {c}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.note && <p className={cn('mx-auto mt-4 max-w-4xl text-sm', dark ? 'text-white/70' : 'text-muted')}>{data.note}</p>}
    </Section>
  );
}

export function GalleryBlock({ data }: BlockProps) {
  return (
    <Section data={data}>
      {head(data, isDark(data.background))}
      <Gallery images={asArray(data.images)} layout={data.layout} columns={data.columns} />
    </Section>
  );
}

export function VideoBlock({ data }: BlockProps) {
  if (!data.url) return null;
  return (
    <Section data={data}>
      {head(data, isDark(data.background))}
      <div className="mx-auto max-w-5xl">
        <VideoEmbed url={data.url} poster={data.poster} title={data.heading || 'Video'} />
      </div>
    </Section>
  );
}

export function VideoReviewsBlock({ data }: BlockProps) {
  const items = asArray<VideoReview>(data.items).filter((i) => i.video || i.poster?.url);
  if (!items.length) return null;
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      {head(data, dark)}
      <VideoReviews items={items} perView={Number(data.perView) || 4} hoverPreview={data.hoverPreview !== false} edgeHover={data.edgeHover !== false} onDark={dark} />
    </Section>
  );
}
