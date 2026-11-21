/** Client-safe helpers to discover where a section leads (internal links) and where its content comes from. */

/** Every internal href ("/something") found anywhere inside a section's data. */
export function extractInternalLinks(data: unknown): string[] {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) return v.forEach(walk);
    const o = v as Record<string, unknown>;
    if (typeof o.href === 'string' && o.href.startsWith('/') && !o.href.startsWith('//')) out.add(o.href);
    Object.values(o).forEach(walk);
  };
  walk(data);
  return [...out];
}

/** "/stays/domes?x#y" → "stays/domes" */
export function pathToSlug(href: string) {
  return href.split('#')[0].split('?')[0].replace(/^\/+|\/+$/g, '');
}

/** Admin collections a block type reads its content from. */
export const SECTION_SOURCES: Record<string, { label: string; href: string }[]> = {
  activities: [{ label: 'Activities', href: '/admin/collections/activities' }],
  specialArrangements: [{ label: 'Special arrangements', href: '/admin/collections/specialArrangements' }],
  staysGrid: [{ label: 'Stay types', href: '/admin/collections/stays' }],
  rooms: [{ label: 'Rooms & units', href: '/admin/collections/rooms' }],
  amenities: [{ label: 'Amenities', href: '/admin/collections/amenities' }],
  awards: [{ label: 'Awards', href: '/admin/collections/awards' }],
  team: [{ label: 'Team', href: '/admin/collections/team' }],
  spaTreatments: [{ label: 'Spa treatments', href: '/admin/collections/spaTreatments' }],
  cafeTimings: [{ label: 'Café timings', href: '/admin/collections/cafeTimings' }],
  cafeMenu: [{ label: 'Café menu items', href: '/admin/collections/menuItems' }, { label: 'Menu categories', href: '/admin/collections/menuCategories' }],
  latestPosts: [{ label: 'Blog posts', href: '/admin/collections/posts' }],
  testimonials: [{ label: 'Testimonials', href: '/admin/collections/testimonials' }, { label: 'Media mentions', href: '/admin/collections/mediaMentions' }],
  mediaMentions: [{ label: 'Media mentions', href: '/admin/collections/mediaMentions' }],
  instagram: [{ label: 'Instagram posts', href: '/admin/collections/instagramPosts' }, { label: 'Instagram settings', href: '/admin/settings?tab=instagram' }],
  faq: [{ label: 'FAQs', href: '/admin/collections/faqs' }],
  faqBrowser: [{ label: 'FAQs', href: '/admin/collections/faqs' }],
  contactDetails: [{ label: 'Contact settings', href: '/admin/settings?tab=contact' }, { label: 'Enquiries', href: '/admin/enquiries' }],
  enquiryForm: [{ label: 'Enquiries', href: '/admin/enquiries' }],
  newsletter: [{ label: 'Subscribers', href: '/admin/subscribers' }],
  stats: [{ label: 'Stats', href: '/admin/collections/stats' }],
};
