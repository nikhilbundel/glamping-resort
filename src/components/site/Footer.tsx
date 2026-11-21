import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube, Twitter, Globe } from 'lucide-react';
import type { Settings } from '@/lib/data';
import type { MenuNode } from '@/lib/types';
import { NewsletterForm } from './NewsletterForm';

const SOCIAL: Record<string, typeof Instagram> = { instagram: Instagram, facebook: Facebook, youtube: Youtube, x: Twitter, linkedin: Linkedin };

function FLink({ item }: { item: MenuNode }) {
  const ext = /^https?:/.test(item.href) || item.newTab;
  return ext ? (
    <a href={item.href} target={item.newTab ? '_blank' : undefined} rel="noopener noreferrer" className="inline-block py-1.5 text-white/75 transition hover:text-white">
      {item.label}
    </a>
  ) : (
    <Link href={item.href} className="inline-block py-1.5 text-white/75 transition hover:text-white">
      {item.label}
    </Link>
  );
}

export function Footer({ s, footer, legal }: { s: Settings; footer: MenuNode[]; legal: MenuNode[] }) {
  const logo = s.general.logoLight || s.general.logoDark;
  const year = new Date().getFullYear();
  const flatFooter = footer.flatMap((m) => [m, ...(m.children || [])]);
  return (
    <footer className="bg-primary-dark text-white" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="container grid gap-12 py-16 md:grid-cols-2 md:py-20 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="lg:col-span-4">
          <Link href="/" aria-label={`${s.general.siteName} home`} className="inline-block">
            {logo?.url ? (
              <Image src={logo.url} unoptimized={logo.url.endsWith(".svg")} alt={logo.alt || s.general.siteName} width={logo.width || 180} height={logo.height || 60} style={{ height: s.general.logoHeight, width: 'auto' }} />
            ) : (
              <span className="font-heading text-3xl font-semibold">{s.general.siteName}</span>
            )}
          </Link>
          {s.footer.about && <p className="mt-6 max-w-sm text-white/70">{s.footer.about}</p>}
          {!!s.social.links.length && (
            <ul className="mt-6 flex gap-2" aria-label="Social media">
              {s.social.links.map((l, i) => {
                const I = SOCIAL[l.platform] || Globe;
                return (
                  <li key={i}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" aria-label={l.platform} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 transition hover:border-accent hover:bg-accent">
                      <I className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <nav className="lg:col-span-2" aria-label="Footer">
          <p className="eyebrow mb-5 text-white/60">{s.footer.quickLinksHeading}</p>
          <ul>
            {flatFooter.map((m) => (
              <li key={m.id}>
                <FLink item={m} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <p className="eyebrow mb-5 text-white/60">{s.footer.contactHeading}</p>
          <ul className="space-y-3 text-white/80">
            {s.contact.phones.map((p) => (
              <li key={p}>
                <a href={`tel:${p.replace(/\s/g, '')}`} className="inline-flex items-center gap-3 hover:text-white">
                  <Phone className="h-4 w-4 text-accent" aria-hidden="true" />
                  {p}
                </a>
              </li>
            ))}
            {s.contact.email && (
              <li>
                <a href={`mailto:${s.contact.email}`} className="inline-flex items-center gap-3 hover:text-white">
                  <Mail className="h-4 w-4 text-accent" aria-hidden="true" />
                  {s.contact.email}
                </a>
              </li>
            )}
            {s.contact.address && (
              <li className="flex gap-3">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="whitespace-pre-line">{s.contact.address}</span>
              </li>
            )}
          </ul>
        </div>

        {s.footer.newsletterEnabled && (
          <div className="lg:col-span-3">
            <p className="eyebrow mb-5 text-white/60">{s.footer.newsletterHeading}</p>
            {s.footer.newsletterText && <p className="mb-4 text-white/70">{s.footer.newsletterText}</p>}
            <NewsletterForm source="footer" dark />
          </div>
        )}
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 text-sm text-white/60 md:flex-row">
          <p>{(s.footer.copyright || '© {year}').replace('{year}', String(year))}</p>
          <ul className="flex flex-wrap justify-center gap-x-6">
            {legal.map((m) => (
              <li key={m.id}>
                <FLink item={m} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
