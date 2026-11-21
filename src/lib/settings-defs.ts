import type { Field } from './fields';

/** Site Settings tabs. Client-safe definitions; values live in the `Setting` table (key → JSON). */
export type SettingsDef = { key: string; label: string; description: string; superAdminOnly?: boolean; fields: Field[] };

export const SETTINGS_DEFS: SettingsDef[] = [
  {
    key: 'general',
    label: 'General',
    description: 'Site name, tagline and logos.',
    fields: [
      { name: 'siteName', label: 'Site name', type: 'text', required: true, half: true },
      { name: 'tagline', label: 'Tagline', type: 'text', half: true },
      { name: 'location', label: 'Location', type: 'text', half: true },
      { name: 'logoLight', label: 'Logo — light (used over hero images)', type: 'image' },
      { name: 'logoDark', label: 'Logo — dark (used on solid header)', type: 'image' },
      { name: 'favicon', label: 'Favicon (square PNG)', type: 'image' },
      { name: 'logoHeight', label: 'Logo height (px)', type: 'number', min: 24, max: 120, half: true },
    ],
  },
  {
    key: 'header',
    label: 'Header',
    description: 'The sticky top bar: logo on the left, Contact and Book Now on the right.',
    fields: [
      { name: 'showLogo', label: 'Show logo in the top-left corner (Logos are in the General tab)', type: 'boolean', half: true },
      { name: 'showContact', label: 'Show Contact button', type: 'boolean', half: true },
      { name: 'contactPosition', label: 'Contact button position', type: 'select', half: true, options: [{ value: 'left', label: 'Top-left corner' }, { value: 'right', label: 'Top-right, next to Book Now' }] },
      { name: 'contactLabel', label: 'Contact button label', type: 'text', half: true },
      { name: 'contactUrl', label: 'Contact button link', type: 'url', half: true },
      { name: 'showBookNow', label: 'Show Book Now button (label & link are in the Booking tab)', type: 'boolean', half: true },
      { name: 'showMainMenu', label: 'Show main menu links (from Menu Builder)', type: 'boolean', half: true },
      { name: 'showUtilityBar', label: 'Show thin utility bar above the header', type: 'boolean', half: true },
      { name: 'transparentOverHero', label: 'Transparent over the hero, solid after scrolling', type: 'boolean', half: true },
    ],
  },
  {
    key: 'booking',
    label: 'Booking',
    description: 'Online booking & payments, and where every "Book Now" button points.',
    fields: [
      { name: 'mode', label: 'Booking mode', type: 'select', options: [{ value: 'online', label: 'Online booking with payment (/book)' }, { value: 'external', label: 'External booking engine URL' }, { value: 'enquiry', label: 'Enquiry form only (/contact#enquiry)' }] },
      { name: 'label', label: 'Button label', type: 'text', half: true },
      { name: 'externalUrl', label: 'External booking URL', type: 'url', half: true, showIf: { field: 'mode', equals: 'external' } },
      { name: 'openInNewTab', label: 'Open external link in new tab', type: 'boolean', half: true, showIf: { field: 'mode', equals: 'external' } },
      { name: '_hOnline', label: 'Online booking', type: 'heading', help: 'Prices are set per room (Stays → Rooms & units) and per date (Rates, guests & availability). All prices include GST.' },
      { name: 'checkInTime', label: 'Check-in time', type: 'text', half: true, placeholder: '12:00 PM' },
      { name: 'checkOutTime', label: 'Check-out time', type: 'text', half: true, placeholder: '11:00 AM' },
      { name: 'childFreeAge', label: 'Children under this age stay free (and don’t count as guests)', type: 'number', min: 0, max: 17, half: true },
      { name: 'maxAdvanceDays', label: 'Guests can book up to … days ahead', type: 'number', min: 7, max: 730, half: true },
      { name: 'taxNote', label: 'Show “Inclusive of all taxes (GST)” at checkout', type: 'boolean', half: true },
      { name: 'notifyEmail', label: 'Email new bookings to', type: 'email', half: true, help: 'Needs SMTP set up in .env.' },
      { name: 'policy', label: 'Booking & cancellation policy (shown at checkout — guests must accept it)', type: 'textarea' },
      { name: 'stayTypes', label: 'Extra stay-type options in the enquiry form', type: 'tags', help: 'Published Stays are listed automatically.' },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    description: 'Shown in the footer, contact page and structured data.',
    fields: [
      { name: 'phones', label: 'Phone numbers', type: 'tags' },
      { name: 'email', label: 'Email', type: 'email', half: true },
      { name: 'reservationsEmail', label: 'Reservations email', type: 'email', half: true },
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'hours', label: 'Front desk hours', type: 'text' },
      { name: 'latitude', label: 'Latitude', type: 'text', half: true },
      { name: 'longitude', label: 'Longitude', type: 'text', half: true },
    ],
  },
  {
    key: 'social',
    label: 'Social links',
    description: 'Icons in the footer.',
    fields: [
      { name: 'links', label: 'Links', type: 'list', itemLabel: 'platform', fields: [
        { name: 'platform', label: 'Platform', type: 'select', half: true, options: ['instagram', 'facebook', 'youtube', 'x', 'linkedin', 'tripadvisor', 'pinterest'].map((v) => ({ value: v, label: v })) },
        { name: 'url', label: 'URL', type: 'url', half: true } ] },
    ],
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    description: 'Floating "Need Help?" button.',
    fields: [
      { name: 'enabled', label: 'Show floating WhatsApp button', type: 'boolean' },
      { name: 'number', label: 'WhatsApp number (with country code, digits only)', type: 'text', half: true },
      { name: 'label', label: 'Button label', type: 'text', half: true },
      { name: 'message', label: 'Pre-filled message', type: 'textarea' },
    ],
  },
  {
    key: 'announcement',
    label: 'Announcement bar',
    description: 'Optional strip above the header.',
    fields: [
      { name: 'enabled', label: 'Enabled', type: 'boolean' },
      { name: 'text', label: 'Text', type: 'text' },
      { name: 'linkLabel', label: 'Link label', type: 'text', half: true },
      { name: 'linkUrl', label: 'Link URL', type: 'url', half: true },
      { name: 'bgColor', label: 'Background color', type: 'color', half: true },
      { name: 'textColor', label: 'Text color', type: 'color', half: true },
      { name: 'startsAt', label: 'Active from', type: 'datetime', half: true },
      { name: 'endsAt', label: 'Active until', type: 'datetime', half: true },
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Footer text, newsletter and copyright.',
    fields: [
      { name: 'about', label: 'Short about text', type: 'textarea' },
      { name: 'quickLinksHeading', label: 'Quick links heading', type: 'text', half: true },
      { name: 'contactHeading', label: 'Contact heading', type: 'text', half: true },
      { name: 'newsletterEnabled', label: 'Show newsletter signup', type: 'boolean' },
      { name: 'newsletterHeading', label: 'Newsletter heading', type: 'text', half: true },
      { name: 'newsletterText', label: 'Newsletter text', type: 'text', half: true },
      { name: 'copyright', label: 'Copyright text ({year} is replaced automatically)', type: 'text' },
    ],
  },
  {
    key: 'cookie',
    label: 'Cookie banner',
    description: 'Consent banner. Analytics only load after consent when enabled.',
    fields: [
      { name: 'enabled', label: 'Show cookie consent banner', type: 'boolean' },
      { name: 'text', label: 'Text', type: 'textarea' },
      { name: 'acceptLabel', label: 'Accept label', type: 'text', half: true },
      { name: 'declineLabel', label: 'Decline label', type: 'text', half: true },
      { name: 'policyUrl', label: 'Policy link', type: 'url' },
    ],
  },
  {
    key: 'instagram',
    label: 'Instagram',
    description: 'Feed source for Instagram blocks.',
    fields: [
      { name: 'handle', label: 'Handle (without @)', type: 'text', half: true },
      { name: 'profileUrl', label: 'Profile URL', type: 'url', half: true },
      { name: 'source', label: 'Feed source', type: 'select', options: [{ value: 'manual', label: 'Manual uploads (Collections → Instagram posts)' }, { value: 'token', label: 'Live feed (Instagram API access token)' }] },
      { name: 'accessToken', label: 'Instagram access token', type: 'text', help: 'Long-lived token from the Instagram API with Instagram Login. Falls back to manual posts on error.' },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'Tracking IDs.',
    superAdminOnly: true,
    fields: [
      { name: 'gaId', label: 'Google Analytics 4 ID (G-XXXX)', type: 'text', half: true },
      { name: 'metaPixelId', label: 'Meta Pixel ID', type: 'text', half: true },
    ],
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    description: 'Show a holding page to visitors while you work (admins still see the site).',
    superAdminOnly: true,
    fields: [
      { name: 'enabled', label: 'Maintenance mode', type: 'boolean' },
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'message', label: 'Message', type: 'textarea' },
    ],
  },
];

export const SEO_FIELDS: Field[] = [
  { name: 'titleTemplate', label: 'Title template (%s = page title)', type: 'text', half: true },
  { name: 'defaultTitle', label: 'Default title', type: 'text', half: true },
  { name: 'defaultDescription', label: 'Default meta description', type: 'textarea' },
  { name: 'ogImage', label: 'Default social share image (1200×630)', type: 'image' },
  { name: 'twitterHandle', label: 'X / Twitter handle', type: 'text', half: true },
  { name: 'priceRange', label: 'Price range for LodgingBusiness schema (e.g. ₹₹₹)', type: 'text', half: true },
  { name: 'noindexSite', label: 'Discourage search engines from indexing the whole site', type: 'boolean' },
];

export const DEFAULT_SETTINGS: Record<string, Record<string, unknown>> = {
  general: { siteName: 'Glamo Home Cheog', tagline: 'Eco-luxury glamping in the hills of Shimla', location: 'Cheog, Shimla', logoLight: null, logoDark: null, favicon: null, logoHeight: 44 },
  contact: { phones: ['+91 90000 00000'], email: 'hello@example.com', reservationsEmail: 'stay@example.com', address: 'Cheog, Shimla', hours: 'Front desk: 7 am – 11 pm', latitude: '', longitude: '' },
  social: { links: [] },
  header: { showLogo: false, showContact: true, contactPosition: 'left', contactLabel: 'Contact', contactUrl: '/contact', showBookNow: true, showMainMenu: false, showUtilityBar: false, transparentOverHero: true },
  booking: {
    mode: 'online', externalUrl: '', label: 'Book Now', openInNewTab: true, stayTypes: [],
    checkInTime: '12:00 PM', checkOutTime: '11:00 AM', childFreeAge: 5, maxAdvanceDays: 365, taxNote: true, notifyEmail: '',
    policy: 'All bookings are non-refundable. Dates can be changed once, subject to availability, if you contact us at least 7 days before check-in.',
  },
  whatsapp: { enabled: true, number: '919000000000', label: 'Need Help?', message: 'Hi! I would like to know more about staying with you.' },
  announcement: { enabled: false, text: '', linkLabel: '', linkUrl: '', bgColor: '#1E3127', textColor: '#FFFFFF', startsAt: '', endsAt: '' },
  footer: { about: '', quickLinksHeading: 'Explore', contactHeading: 'Get in touch', newsletterEnabled: true, newsletterHeading: 'Letters from the mountains', newsletterText: 'Seasonal news and offers, a few times a year.', copyright: '© {year} Glamo Home Cheog. All rights reserved.' },
  cookie: { enabled: true, text: 'We use cookies to understand how our site is used and to improve your experience.', acceptLabel: 'Accept', declineLabel: 'Decline', policyUrl: '/privacy-policy' },
  analytics: { gaId: '', metaPixelId: '' },
  instagram: { handle: 'yourresort', profileUrl: 'https://instagram.com/', source: 'manual', accessToken: '' },
  maintenance: { enabled: false, heading: 'We’ll be right back', message: 'Our website is getting a little care. Please check back shortly.' },
  seo: { titleTemplate: '%s | Glamo Home Cheog', defaultTitle: 'Glamo Home Cheog — Eco-luxury glamping in Cheog, Shimla', defaultDescription: 'A geodesic glamping dome, cosy Backwood Stays and a glass café in the forests of Cheog, Shimla. Book direct.', ogImage: null, twitterHandle: '', priceRange: '₹₹₹', noindexSite: false },
};
