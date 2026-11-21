import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { prisma } from '@/lib/db';
import { Section, SectionHeading, Eyebrow, isDark } from '@/components/ui/Section';
import { RichText } from '@/components/ui/RichText';
import { SmartImage } from '@/components/ui/SmartImage';
import { LazyEnquiryForm as EnquiryForm } from './client/lazy';
import { NewsletterForm } from '@/components/site/NewsletterForm';
import { cn } from '@/lib/utils';
import type { BlockProps, BlockCtx } from './types';

async function stayTypes(ctx: BlockCtx) {
  const stays = await prisma.stay.findMany({ where: { published: true }, orderBy: { order: 'asc' }, select: { name: true } });
  return [...stays.map((s) => s.name), ...(ctx.settings.booking.stayTypes || [])];
}

export async function ContactDetailsBlock({ data, ctx }: BlockProps) {
  const c = ctx.settings.contact;
  const dark = isDark(data.background);
  const types = await stayTypes(ctx);
  const row = 'flex gap-4';
  const ico = cn('mt-1 h-5 w-5 shrink-0', dark ? 'text-white' : 'text-accent');
  return (
    <Section data={data}>
      <div className={cn('grid gap-12 lg:gap-20', data.showForm !== false && 'lg:grid-cols-5')}>
        <div className="lg:col-span-2">
          <SectionHeading eyebrow={data.eyebrow} heading={data.heading} intro={data.intro} align="left" onDark={dark} className="!mb-10" />
          <ul className="space-y-6">
            {!!c.phones.length && (
              <li className={row}>
                <Phone className={ico} aria-hidden="true" />
                <div>
                  <p className="eyebrow mb-1 opacity-70">Call us</p>
                  {c.phones.map((p) => (
                    <a key={p} href={`tel:${p.replace(/\s/g, '')}`} className="block text-lg hover:text-accent">{p}</a>
                  ))}
                </div>
              </li>
            )}
            {(c.email || c.reservationsEmail) && (
              <li className={row}>
                <Mail className={ico} aria-hidden="true" />
                <div>
                  <p className="eyebrow mb-1 opacity-70">Email</p>
                  {[c.email, c.reservationsEmail].filter(Boolean).map((e) => (
                    <a key={e} href={`mailto:${e}`} className="block text-lg hover:text-accent">{e}</a>
                  ))}
                </div>
              </li>
            )}
            {c.address && (
              <li className={row}>
                <MapPin className={ico} aria-hidden="true" />
                <div>
                  <p className="eyebrow mb-1 opacity-70">Address</p>
                  <address className="whitespace-pre-line not-italic">{c.address}</address>
                </div>
              </li>
            )}
            {c.hours && (
              <li className={row}>
                <Clock className={ico} aria-hidden="true" />
                <p>{c.hours}</p>
              </li>
            )}
          </ul>
        </div>
        {data.showForm !== false && (
          <div className="text-ink lg:col-span-3">
            {data.formHeading && <h2 className={cn('font-heading text-h3 font-semibold', dark && 'text-white')}>{data.formHeading}</h2>}
            {data.formIntro && <p className={cn('mb-6 mt-2', dark ? 'text-white/75' : 'text-muted')}>{data.formIntro}</p>}
            <EnquiryForm stayTypes={types} />
          </div>
        )}
      </div>
    </Section>
  );
}

export async function EnquiryFormBlock({ data, ctx }: BlockProps) {
  const dark = isDark(data.background);
  return (
    <Section data={data}>
      <SectionHeading eyebrow={data.eyebrow} heading={data.heading} intro={data.intro} align={data.align || 'center'} onDark={dark} />
      <div className="mx-auto max-w-3xl text-ink">
        <EnquiryForm stayTypes={await stayTypes(ctx)} submitLabel={data.submitLabel || undefined} successMessage={data.successMessage || undefined} />
      </div>
    </Section>
  );
}

export function MapBlock({ data }: BlockProps) {
  const dark = isDark(data.background);
  const safeEmbed = typeof data.embedUrl === 'string' && /^https:\/\/(www\.|maps\.)?google\.[a-z.]+\/maps(\/embed|\?)/.test(data.embedUrl) ? data.embedUrl : null;
  return (
    <Section data={data}>
      <SectionHeading eyebrow={data.eyebrow} heading={data.heading} intro={data.intro} align={data.align || 'center'} onDark={dark} />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative min-h-[360px] overflow-hidden rounded-card bg-line shadow-soft">
          {safeEmbed ? (
            <iframe src={safeEmbed} title="Map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 h-full w-full border-0" allowFullScreen />
          ) : (
            <SmartImage image={data.staticImage} sizes="(min-width:1024px) 50vw, 100vw" loading="lazy" />
          )}
        </div>
        <div>
          <RichText html={data.directions} onDark={dark} />
          {safeEmbed && data.staticImage?.url && (
            <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-card">
              <SmartImage image={data.staticImage} sizes="(min-width:1024px) 50vw, 100vw" loading="lazy" />
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

export function NewsletterBlock({ data }: BlockProps) {
  const dark = data.background ? isDark(data.background) : true;
  return (
    <Section data={{ ...data, background: data.background || 'green' }}>
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow onDark={dark}>{data.eyebrow}</Eyebrow>
        {data.heading && <h2 className="font-heading text-h2 font-semibold">{data.heading}</h2>}
        {data.text && <p className={cn('mt-4', dark ? 'text-white/80' : 'text-muted')}>{data.text}</p>}
        <div className="mx-auto mt-8 max-w-lg">
          <NewsletterForm source="section" dark={dark} buttonLabel={data.buttonLabel || 'Subscribe'} />
        </div>
      </div>
    </Section>
  );
}
