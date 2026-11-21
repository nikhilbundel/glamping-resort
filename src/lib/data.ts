import 'server-only';
import { cache } from 'react';
import { prisma } from './db';
import { DEFAULT_SETTINGS } from './settings-defs';
import { normalizeTheme, type Theme } from './theme';
import type { ImageValue, MenuNode } from './types';
import { asArray } from './utils';

export type Settings = {
  general: { siteName: string; tagline: string; location: string; logoLight: ImageValue | null; logoDark: ImageValue | null; favicon: ImageValue | null; logoHeight: number };
  contact: { phones: string[]; email: string; reservationsEmail: string; address: string; hours: string; latitude: string; longitude: string };
  social: { links: { platform: string; url: string }[] };
  header: { showLogo: boolean; showContact: boolean; contactPosition: 'left' | 'right'; contactLabel: string; contactUrl: string; showBookNow: boolean; showMainMenu: boolean; showUtilityBar: boolean; transparentOverHero: boolean };
  booking: { mode: 'online' | 'external' | 'enquiry'; externalUrl: string; label: string; openInNewTab: boolean; stayTypes: string[]; checkInTime?: string; checkOutTime?: string; childFreeAge?: number; maxAdvanceDays?: number; taxNote?: boolean; notifyEmail?: string; policy?: string };
  whatsapp: { enabled: boolean; number: string; label: string; message: string };
  announcement: { enabled: boolean; text: string; linkLabel: string; linkUrl: string; bgColor: string; textColor: string; startsAt: string; endsAt: string };
  footer: { about: string; quickLinksHeading: string; contactHeading: string; newsletterEnabled: boolean; newsletterHeading: string; newsletterText: string; copyright: string };
  cookie: { enabled: boolean; text: string; acceptLabel: string; declineLabel: string; policyUrl: string };
  analytics: { gaId: string; metaPixelId: string };
  instagram: { handle: string; profileUrl: string; source: 'manual' | 'token'; accessToken: string };
  maintenance: { enabled: boolean; heading: string; message: string };
  seo: { titleTemplate: string; defaultTitle: string; defaultDescription: string; ogImage: ImageValue | null; twitterHandle: string; priceRange: string; noindexSite: boolean };
};

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const out: Record<string, unknown> = {};
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS)) {
    out[k] = { ...def, ...((map[k] as object) || {}) };
  }
  return out as Settings;
});

export const getTheme = cache(async (): Promise<Theme> => {
  const row = await prisma.setting.findUnique({ where: { key: 'theme' } });
  return normalizeTheme(row?.value);
});

export const getMenus = cache(async () => {
  const rows = await prisma.menu.findMany();
  // Hidden items (and everything under a hidden parent) never reach the website.
  const visible = (nodes: MenuNode[]): MenuNode[] => nodes.filter((n) => !n.hidden).map((n) => ({ ...n, children: visible(n.children || []) }));
  const get = (loc: string) => visible(asArray<MenuNode>(rows.find((r) => r.location === loc)?.items));
  return { header: get('header'), utility: get('utility'), footer: get('footer'), legal: get('legal') };
});

export const getPage = cache(async (slug: string, draft = false) => {
  const page = await prisma.page.findUnique({
    where: { slug },
    include: { sections: { orderBy: { order: 'asc' } } },
  });
  if (!page) return null;
  if (!page.published && !draft) return null;
  const sections = page.sections
    .filter((s) => s.isVisible)
    .map((s) => ({ id: s.id, type: s.type, data: (draft && s.draftData ? s.draftData : s.data) as Record<string, unknown> }));
  return { ...page, sections };
});

export function bookingLink(s: Settings, roomId?: string) {
  if (s.booking.mode === 'online') return { href: roomId ? `/book?room=${roomId}` : '/book', label: s.booking.label || 'Book Now', newTab: false };
  if (s.booking.mode === 'external' && s.booking.externalUrl) {
    return { href: s.booking.externalUrl, label: s.booking.label || 'Book Now', newTab: s.booking.openInNewTab };
  }
  return { href: '/contact#enquiry', label: s.booking.label || 'Book Now', newTab: false };
}

export function announcementActive(a: Settings['announcement']) {
  if (!a.enabled || !a.text) return false;
  const now = Date.now();
  if (a.startsAt && new Date(a.startsAt).getTime() > now) return false;
  if (a.endsAt && new Date(a.endsAt).getTime() < now) return false;
  return true;
}

export type InstaItem = { id: string; image: ImageValue; link: string; caption: string };

/** Instagram feed: live (token) with graceful fallback to manual posts. */
export const getInstagram = cache(async (count: number): Promise<InstaItem[]> => {
  const s = await getSettings();
  if (s.instagram.source === 'token' && s.instagram.accessToken) {
    try {
      const res = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&limit=${count}&access_token=${encodeURIComponent(s.instagram.accessToken)}`,
        { next: { revalidate: 3600 } },
      );
      if (res.ok) {
        const json = (await res.json()) as { data?: { id: string; caption?: string; media_type: string; media_url: string; thumbnail_url?: string; permalink: string }[] };
        const items = (json.data || []).slice(0, count).map((m) => ({
          id: m.id,
          image: { url: m.media_type === 'VIDEO' ? m.thumbnail_url || m.media_url : m.media_url, alt: (m.caption || 'Instagram post').slice(0, 120), width: 800, height: 800 },
          link: m.permalink,
          caption: m.caption || '',
        }));
        if (items.length) return items;
      }
    } catch (e) {
      console.warn('instagram feed failed, using manual posts', e);
    }
  }
  const rows = await prisma.instagramPost.findMany({ where: { published: true }, orderBy: { order: 'asc' }, take: count });
  return rows.map((r) => ({ id: r.id, image: r.image as unknown as ImageValue, link: r.link || s.instagram.profileUrl, caption: r.caption || '' }));
});
