import { hexToRgbTriplet } from './utils';

export type Theme = {
  colors: Record<ColorToken, string>;
  headingFont: string;
  bodyFont: string;
  buttonRadius: number;
  cardRadius: number;
  sectionSpacing: 'compact' | 'normal' | 'airy';
  /** solid = filled buttons, outline = thin border that fills in on hover */
  buttonStyle?: 'solid' | 'outline';
  /** Site-wide text sizes in % (100 = normal) */
  textSizes?: { eyebrow: number; heading: number; title: number; body: number };
};

export const COLOR_TOKENS = ['primary', 'primary-dark', 'accent', 'bg', 'surface', 'text', 'muted', 'border', 'button', 'button-text'] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];

export const COLOR_LABELS: Record<ColorToken, string> = {
  primary: 'Primary (pine green)',
  'primary-dark': 'Primary dark',
  accent: 'Accent (buttons, links)',
  bg: 'Page background',
  surface: 'Cards / surfaces',
  text: 'Text',
  muted: 'Muted text',
  border: 'Borders',
  button: 'Buttons (Book Now, Explore…)',
  'button-text': 'Button text',
};

export const DEFAULT_THEME: Theme = {
  colors: {
    primary: '#2F4A3A',
    'primary-dark': '#1E3127',
    accent: '#B8834F',
    bg: '#FAF6EF',
    surface: '#FFFFFF',
    text: '#2A2A2A',
    muted: '#6B6B6B',
    border: '#E7DFD2',
    button: '#B8834F',
    'button-text': '#FFFFFF',
  },
  headingFont: 'Cormorant Garamond',
  bodyFont: 'Jost',
  buttonRadius: 999,
  cardRadius: 12,
  sectionSpacing: 'normal',
  buttonStyle: 'solid',
  textSizes: { eyebrow: 100, heading: 100, title: 100, body: 100 },
};

type Preset = { id: string; name: string; description: string; theme: Theme };
const P = (id: string, name: string, description: string, c: string[], headingFont: string, bodyFont: string, buttonRadius: number, cardRadius: number, sectionSpacing: Theme['sectionSpacing'] = 'normal'): Preset => ({
  id, name, description,
  theme: { colors: Object.fromEntries(COLOR_TOKENS.map((k, i) => [k, c[i] ?? (k === 'button' ? c[2] : '#FFFFFF')])) as Theme['colors'], headingFont, bodyFont, buttonRadius, cardRadius, sectionSpacing, buttonStyle: 'solid' },
});

/** Ready-made looks. Picking one fills every setting; you can still tweak anything afterwards (that becomes “Custom”). */
export const THEME_PRESETS: Preset[] = [
  { id: 'pine', name: 'Pine & Sand', description: 'The original forest-green and warm sand look.', theme: DEFAULT_THEME },
  //            primary    primary-dark accent     bg         surface    text       muted      border
  P('midnight', 'Midnight Lake', 'Deep navy with soft gold — calm and premium.', ['#1F3354', '#132239', '#C9A45C', '#F6F4EF', '#FFFFFF', '#1C2230', '#5F6878', '#E2DED4'], 'Playfair Display', 'Manrope', 8, 10),
  P('terracotta', 'Terracotta Desert', 'Earthy clay and olive — warm, rustic, sun-baked.', ['#8A4B32', '#5E301F', '#6B7B3A', '#F8F1E7', '#FFFDF9', '#2E241E', '#76675C', '#EADBC8'], 'Fraunces', 'DM Sans', 999, 16, 'airy'),
  P('alpine', 'Alpine Snow', 'Cool slate and glacier blue — crisp mountain air.', ['#34495E', '#22303D', '#4A90A4', '#F5F8FA', '#FFFFFF', '#1F2A33', '#62707C', '#DCE4EA'], 'Marcellus', 'Inter', 6, 8),
  P('charcoal', 'Charcoal Minimal', 'Near-black with a copper accent — modern and clean.', ['#2B2B2B', '#141414', '#B5703F', '#FAFAF8', '#FFFFFF', '#1A1A1A', '#6E6E6E', '#E6E4DF'], 'DM Serif Display', 'Outfit', 4, 6, 'compact'),
  P('monoluxe', 'Monochrome Luxe', 'Black, ivory and champagne — boutique-hotel elegance.', ['#111111', '#000000', '#A8936A', '#FBF9F5', '#FFFFFF', '#161616', '#707070', '#E9E4DA'], 'Cinzel', 'Karla', 0, 0, 'airy'),
  //            primary    primary-dark accent     bg         surface    text       muted      border     button     button-text
  P('noir', 'Noir Linen', 'Black buttons on soft linen — the most minimal, editorial look.', ['#1A1A1A', '#0D0D0D', '#8C7B65', '#F7F5F0', '#FFFFFF', '#1A1A1A', '#6B6B6B', '#E5E1D8', '#111111', '#FFFFFF'], 'Cormorant Garamond', 'Jost', 0, 4, 'airy'),
  P('blacksage', 'Black & Sage', 'Black buttons with muted sage green — calm, natural, modern.', ['#4E5D4A', '#323D30', '#7D8C6A', '#F6F6F1', '#FFFFFF', '#1F241E', '#666C63', '#DFE2D8', '#111111', '#FFFFFF'], 'Marcellus', 'Inter', 999, 10),
  P('blackteal', 'Black & Teal', 'Your teal accents with black buttons — fresh but grounded.', ['#1E5B63', '#123B41', '#2A8C99', '#F7F7F5', '#FFFFFF', '#1B1F21', '#62696C', '#E1E4E4', '#111111', '#FFFFFF'], 'Marcellus', 'Inter', 6, 10),
  P('blackstone', 'Black & Warm Stone', 'Black buttons, warm stone and clay — boutique mountain lodge.', ['#5A4A3F', '#3B2F27', '#A0705A', '#F5F1EB', '#FFFFFF', '#211B17', '#6F655D', '#E6DDD2', '#141414', '#FFFFFF'], 'Playfair Display', 'DM Sans', 999, 12),
  //            primary    primary-dark accent     bg         surface    text       muted      border     button     button-text
  P('deodar', 'Deodar Forest', 'Deep deodar green, linen and brass — calm forest luxury.', ['#2E4636', '#1B2B21', '#8C6F45', '#F4F1EA', '#FFFFFF', '#1F2420', '#67706A', '#DFDAD0', '#1B2B21', '#FFFFFF'], 'Instrument Serif', 'Instrument Sans', 2, 6, 'airy'),
  P('apple', 'Shimla Apple', 'Orchard red, cream and honey — warm and local.', ['#7A2E2E', '#521D1D', '#A86F27', '#FBF6F0', '#FFFFFF', '#2B1E1B', '#75625C', '#ECDCCF', '#7A2E2E', '#FFFFFF'], 'Gloock', 'Lexend', 999, 14),
  P('glacier', 'Glacier Mist', 'Icy blue-grey with black buttons — crisp and quiet.', ['#3E5C76', '#263A4D', '#4F7C9C', '#F3F6F8', '#FFFFFF', '#1C2731', '#5E6E7B', '#D9E2E8', '#111111', '#FFFFFF'], 'Tenor Sans', 'Albert Sans', 0, 4),
  P('saffron', 'Saffron Sunset', 'Charcoal with saffron buttons — sunset over the ridge.', ['#3B3A36', '#22211F', '#B07200', '#FAF7F0', '#FFFFFF', '#22211F', '#6E6A60', '#E8E2D3', '#D98E04', '#1A1A1A'], 'Young Serif', 'Plus Jakarta Sans', 999, 16),
  P('moonlit', 'Moonlit Dome', 'Midnight navy and moonlight gold — for star-gazing nights.', ['#1C2541', '#0B132B', '#9C8653', '#F5F4F0', '#FFFFFF', '#11172B', '#5B6175', '#DEDBD2', '#0B132B', '#FFFFFF'], 'Gilda Display', 'Urbanist', 6, 10),
  P('rhododendron', 'Rhododendron Bloom', 'Himalayan rhododendron pink with black buttons — soft and romantic.', ['#8E3B46', '#5E2530', '#B5656B', '#FCF7F6', '#FFFFFF', '#2A1D20', '#786569', '#EFDFDD', '#111111', '#FFFFFF'], 'Italiana', 'Lato', 0, 2, 'airy'),
  P('kinnaur', 'Kinnaur Stone', 'Slate stone and copper — modern mountain architecture.', ['#4A4E52', '#2E3134', '#B0703C', '#F3F2EF', '#FFFFFF', '#1E2022', '#6B6E71', '#DDDBD6', '#2E3134', '#FFFFFF'], 'Syne', 'Figtree', 4, 8, 'compact'),
  P('snowline', 'Snowline Minimal', 'Pure white and black — gallery-like and very minimal.', ['#222222', '#000000', '#6B6B6B', '#FFFFFF', '#F7F7F7', '#111111', '#707070', '#E6E6E6', '#000000', '#FFFFFF'], 'Bellefair', 'Raleway', 0, 0, 'airy'),
  P('pahadi', 'Pahadi Heritage', 'Walnut wood and terracotta — Himachali warmth.', ['#5B3A29', '#3A2419', '#B5651D', '#F7F0E6', '#FFFDF9', '#2C1D14', '#78685B', '#E7D9C6', '#5B3A29', '#FFFFFF'], 'Rozha One', 'Mulish', 8, 12),
  P('boutique', 'Boutique Noir', 'Black, champagne and ivory — five-star boutique.', ['#1E1E1E', '#0A0A0A', '#9A7D42', '#F6F3EE', '#FFFFFF', '#141414', '#6A6A6A', '#E4DFD6', '#0A0A0A', '#FFFFFF'], 'Bodoni Moda', 'Figtree', 0, 0),
  P('jungle', 'Monsoon Jungle', 'Rich jungle green and marigold — lush and lively.', ['#1F5A45', '#123829', '#E0A526', '#F4F7F1', '#FFFFFF', '#1D2A24', '#5E6E66', '#D9E4DC'], 'Lora', 'Nunito Sans', 999, 14),
];

/** Which preset (if any) matches the theme exactly. */
export function matchPreset(t: Theme) {
  const key = (x: Theme) => JSON.stringify([ // button style is chosen separately, so it doesn't affect which preset is active
   COLOR_TOKENS.map((k) => (x.colors[k] || '').toUpperCase()), x.headingFont, x.bodyFont, x.buttonRadius, x.cardRadius, x.sectionSpacing]);
  return THEME_PRESETS.find((p) => key(p.theme) === key(t))?.id || null;
}

export const HEADING_FONTS = [
  // classic serifs
  'Cormorant Garamond', 'Playfair Display', 'Lora', 'Libre Baskerville', 'EB Garamond', 'Fraunces', 'Prata', 'Crimson Pro', 'Source Serif 4',
  // elegant / display
  'Bodoni Moda', 'Italiana', 'Gilda Display', 'Bellefair', 'Forum', 'Marcellus', 'Cinzel', 'DM Serif Display', 'Instrument Serif', 'Gloock', 'Young Serif', 'Yeseva One', 'Abril Fatface', 'Rozha One', 'Philosopher',
  // modern sans headings
  'Tenor Sans', 'Josefin Sans', 'Syne', 'Montserrat', 'Raleway', 'Poppins', 'Outfit',
];
export const BODY_FONTS = [
  'Jost', 'Inter', 'Manrope', 'DM Sans', 'Outfit', 'Work Sans', 'Lato', 'Nunito Sans', 'Karla', 'Source Sans 3',
  'Figtree', 'Plus Jakarta Sans', 'Lexend', 'Albert Sans', 'Urbanist', 'Instrument Sans', 'Raleway', 'Red Hat Display', 'Libre Franklin', 'Poppins', 'Mulish', 'Quicksand', 'Montserrat', 'Josefin Sans',
  // serif body text
  'EB Garamond', 'Crimson Pro', 'Source Serif 4', 'Lora',
];

/** Font pairs that work well together — one click sets both fonts and keeps your colours. */
export const FONT_PAIRS: { name: string; heading: string; body: string; mood: string }[] = [
  { name: 'Mountain Lodge', heading: 'Cormorant Garamond', body: 'Jost', mood: 'Warm, classic, calm' },
  { name: 'Boutique Hotel', heading: 'Bodoni Moda', body: 'Figtree', mood: 'High-fashion, premium' },
  { name: 'Soft Luxury', heading: 'Italiana', body: 'Lato', mood: 'Light, airy, elegant' },
  { name: 'Contemporary', heading: 'Instrument Serif', body: 'Instrument Sans', mood: 'Modern editorial' },
  { name: 'Minimal Nordic', heading: 'Tenor Sans', body: 'Albert Sans', mood: 'Clean, quiet, Scandinavian' },
  { name: 'Friendly Retreat', heading: 'Young Serif', body: 'Plus Jakarta Sans', mood: 'Warm and welcoming' },
  { name: 'Grand Heritage', heading: 'Cinzel', body: 'Raleway', mood: 'Stately, timeless' },
  { name: 'Gallery', heading: 'Gilda Display', body: 'Red Hat Display', mood: 'Art-gallery refined' },
  { name: 'Bold Statement', heading: 'Gloock', body: 'Lexend', mood: 'Confident, high contrast' },
  { name: 'Pahadi Heritage', heading: 'Rozha One', body: 'Mulish', mood: 'Indian character, warm' },
  { name: 'Design Studio', heading: 'Syne', body: 'Figtree', mood: 'Creative, contemporary' },
  { name: 'Natural', heading: 'Fraunces', body: 'Urbanist', mood: 'Organic, soft' },
  { name: 'Snowfall', heading: 'Bellefair', body: 'Raleway', mood: 'Delicate and bright' },
  { name: 'Storybook', heading: 'Lora', body: 'Nunito Sans', mood: 'Gentle, readable' },
  { name: 'All Sans', heading: 'Josefin Sans', body: 'Quicksand', mood: 'Geometric, playful' },
  { name: 'Literary', heading: 'Playfair Display', body: 'Crimson Pro', mood: 'Bookish, serif throughout' },
];

export function normalizeTheme(raw: unknown): Theme {
  const t = (raw && typeof raw === 'object' ? raw : {}) as Partial<Theme>;
  return {
    ...DEFAULT_THEME,
    ...t,
    colors: {
      ...DEFAULT_THEME.colors,
      // Themes saved before button colours existed keep their buttons in the accent colour.
      button: t.colors?.accent || DEFAULT_THEME.colors.button,
      ...(t.colors || {}),
    },
    textSizes: { ...DEFAULT_THEME.textSizes!, ...(t.textSizes || {}) },
  };
}

/** Outline buttons: transparent with a thin border in the button colour; fill in on hover.
 *  Selected filter chips / current page links stay filled so the active state is still clear. */
const B = '.bg-btn:not([aria-pressed=true]):not([aria-current=page])';
const ON_DARK = ['[data-over-hero]', '[data-hero]', '.bg-primary', '.bg-\\[\\#1f1f1f\\]'];
const OUTLINE_CSS = [
  `${B}{background-color:transparent!important;color:rgb(var(--button-rgb))!important;box-shadow:inset 0 0 0 1px rgb(var(--button-rgb));}`,
  `${B}:hover{background-color:rgb(var(--button-rgb))!important;color:rgb(var(--button-text-rgb))!important;filter:none;}`,
  // over photos / videos and on green or charcoal sections, outline buttons turn white so they stay visible
  `${ON_DARK.map((d) => `${d} ${B}`).join(',')}{color:#fff!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.85);}`,
  `${ON_DARK.map((d) => `${d} ${B}:hover`).join(',')}{background-color:#fff!important;color:rgb(var(--text-rgb))!important;}`,
].join('');

/** CSS variables for :root. Both hex (for inline styles) and RGB triplets (for Tailwind alpha) are emitted. */
export function themeCss(theme: Theme) {
  const lines: string[] = [];
  for (const k of COLOR_TOKENS) {
    const hex = theme.colors[k] || DEFAULT_THEME.colors[k];
    lines.push(`--${k}:${hex};--${k}-rgb:${hexToRgbTriplet(hex)};`);
  }
  const spacing = { compact: ['3.5rem', '5rem'], normal: ['5rem', '7rem'], airy: ['6rem', '9rem'] }[theme.sectionSpacing] || ['5rem', '7rem'];
  lines.push(`--font-heading:'${theme.headingFont}';--font-body:'${theme.bodyFont}';`);
  lines.push(`--radius-btn:${theme.buttonRadius}px;--radius-card:${theme.cardRadius}px;`);
  lines.push(`--section-y:${spacing[0]};--section-y-md:${spacing[1]};`);
  const ts = { ...DEFAULT_THEME.textSizes!, ...(theme.textSizes || {}) };
  lines.push(`--ts-eyebrow:${ts.eyebrow / 100};--ts-heading:${ts.heading / 100};--ts-title:${ts.title / 100};--ts-body:${ts.body / 100};`);
  return `:root{${lines.join('')}}${theme.buttonStyle === 'outline' ? OUTLINE_CSS : ''}`;
}

// Fonts that don't ship every weight (the Google Fonts CSS2 API rejects unavailable weights)
/** Fonts that only come in some weights (asking Google Fonts for a missing weight breaks the stylesheet). */
const WEIGHT_OVERRIDES: Record<string, string> = {
  Marcellus: '400',
  'DM Serif Display': '400',
  Prata: '400',
  'Libre Baskerville': '400;700',
  Lato: '300;400;700',
  Italiana: '400',
  'Gilda Display': '400',
  Bellefair: '400',
  Forum: '400',
  'Instrument Serif': '400',
  Gloock: '400',
  'Young Serif': '400',
  'Yeseva One': '400',
  'Abril Fatface': '400',
  'Rozha One': '400',
  Philosopher: '400;700',
  'Tenor Sans': '400',
  'Instrument Sans': '400;500;600;700',
  'EB Garamond': '400;500;600;700',
  Cinzel: '400;500;600;700',
  Lora: '400;500;600;700',
};

export function googleFontsHref(theme: Theme) {
  const fam = (name: string, weights: string) =>
    `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@${WEIGHT_OVERRIDES[name] || weights}`;
  return `https://fonts.googleapis.com/css2?${fam(theme.headingFont, '500;600;700')}&${fam(theme.bodyFont, '300;400;500;600')}&display=swap`;
}
