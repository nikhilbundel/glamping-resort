import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { draftMode } from 'next/headers';
import { Toaster } from 'sonner';
import { getMenus, getSettings, getTheme, bookingLink, announcementActive } from '@/lib/data';
import { googleFontsHref, themeCss } from '@/lib/theme';
import { lodgingJsonLd } from '@/lib/seo';
import { siteUrl } from '@/lib/utils';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { WhatsAppButton, ScrollTop, ConsentAndAnalytics } from '@/components/site/Floating';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl('/')),
    title: { default: s.seo.defaultTitle, template: s.seo.titleTemplate || '%s' },
    description: s.seo.defaultDescription,
    icons: s.general.favicon?.url ? { icon: s.general.favicon.url, apple: s.general.favicon.url } : undefined,
  };
}

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [s, theme, menus] = await Promise.all([getSettings(), getTheme(), getMenus()]);
  const { isEnabled: draft } = draftMode();
  const ann = announcementActive(s.announcement) ? s.announcement : null;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={googleFontsHref(theme)} />
      <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingJsonLd(s)) }} />
      <noscript>
        <style>{`[style*="opacity:0"],.hx-hidden{opacity:1!important;transform:none!important}`}</style>
      </noscript>
      <a href="#main" className="skip-link">Skip to content</a>
      <a href="#footer-heading" className="skip-link">Skip to footer</a>
      {draft && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-ink px-5 py-2 text-sm text-white shadow-lift">
          Preview mode (showing drafts) · <a href="/api/preview/disable" className="underline">Exit</a>
        </div>
      )}
      <Header
        siteName={s.general.siteName}
        logoLight={s.general.logoLight}
        logoDark={s.general.logoDark}
        logoHeight={s.general.logoHeight || 44}
        header={menus.header}
        utility={menus.utility}
        booking={bookingLink(s)}
        options={s.header}
        announcement={ann && { text: ann.text, linkLabel: ann.linkLabel, linkUrl: ann.linkUrl, bgColor: ann.bgColor || '#1E3127', textColor: ann.textColor || '#fff' }}
      />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer s={s} footer={menus.footer} legal={menus.legal} />
      {s.whatsapp.enabled && s.whatsapp.number && <WhatsAppButton number={s.whatsapp.number} message={s.whatsapp.message} label={s.whatsapp.label || 'Need Help?'} />}
      <ScrollTop />
      <ConsentAndAnalytics cookie={s.cookie} gaId={s.analytics.gaId} pixelId={s.analytics.metaPixelId} />
      <Toaster position="top-center" />
    </>
  );
}
