import { F, headingFields, styleFields, type Field } from './fields';
import { HERO_ANIM_OPTIONS, HERO_FONT_OPTIONS } from './hero-options';

/**
 * Block library. Each section type declares its editable fields; the admin form,
 * validation and defaults are generated from these definitions.
 * Client-safe.
 */
export type SectionDef = {
  type: string;
  label: string;
  description: string;
  icon: string; // lucide icon name
  category: 'Hero & layout' | 'Content' | 'Collections' | 'Forms & contact' | 'Media';
  fields: Field[];
};

const slideFields: Field[] = [
  { name: 'contentType', label: 'What appears over the video / photo', type: 'select', default: 'text', options: [
    { value: 'text', label: 'Text' }, { value: 'image', label: 'Image (JPG / PNG)' } ] },
  { name: 'heading', label: 'Main text (press Enter for a new line)', type: 'textarea', showIf: { field: 'contentType', equals: ['text', ''] } },
  { name: 'contentImage', label: 'Image shown instead of text (transparent PNG works best)', type: 'image', showIf: { field: 'contentType', equals: 'image' } },
  { name: 'contentImageWidth', label: 'Image width on desktop (px)', type: 'number', min: 40, max: 1600, half: true, default: 600, showIf: { field: 'contentType', equals: 'image' } },
  { name: 'contentImageMobileWidth', label: 'Image width on mobile (px)', type: 'number', min: 40, max: 600, half: true, default: 300, showIf: { field: 'contentType', equals: 'image' } },
  { name: 'animation', label: 'Entrance animation for this slide', type: 'select', default: '', options: [{ value: '', label: 'Use the default (section 6)' }, ...HERO_ANIM_OPTIONS] },
  { name: 'video', label: 'Background video (MP4 / WebM — upload or paste a URL). Plays muted on desktop and mobile.', type: 'video' },
  { name: 'mobileVideo', label: 'Mobile video (optional, smaller/portrait file for phones)', type: 'video' },
  { name: 'image', label: 'Background photo (also shown while the video loads)', type: 'image' },
  { name: '_hExtra', label: 'Optional extras (leave empty to hide)', type: 'heading' },
  { name: 'badge', label: 'Badge', type: 'text', half: true },
  { name: 'subheading', label: 'Small text above', type: 'text', half: true },
  { name: 'text', label: 'Paragraph below', type: 'textarea' },
  { name: 'ctas', label: 'Buttons (max 2)', type: 'ctas', maxItems: 2 },
];

const heroTextFields: Field[] = [
  { name: 'fontFamily', label: 'Font (40+ Google Fonts)', type: 'select', half: true, default: 'heading', options: HERO_FONT_OPTIONS },
  { name: 'fontWeight', label: 'Font weight', type: 'select', half: true, default: '600', options: [
    { value: '100', label: '100 — Thin' }, { value: '200', label: '200 — Extra light' }, { value: '300', label: '300 — Light' }, { value: '400', label: '400 — Regular' },
    { value: '500', label: '500 — Medium' }, { value: '600', label: '600 — Semi-bold' }, { value: '700', label: '700 — Bold' }, { value: '800', label: '800 — Extra bold' }, { value: '900', label: '900 — Black' } ] },
  { name: 'fontSize', label: 'Text size on desktop (px)', type: 'number', min: 16, max: 240, half: true, default: 88 },
  { name: 'mobileFontSize', label: 'Text size on mobile (px)', type: 'number', min: 14, max: 140, half: true, default: 44 },
  { name: 'textEffect', label: 'Text effect', type: 'select', half: true, default: 'solid', options: [
    { value: 'solid', label: 'Solid colour' }, { value: 'outline', label: 'Outline only' }, { value: 'gradient', label: 'Gradient (colour 1 → colour 2)' }, { value: 'glow', label: 'Glow (colour 2)' } ] },
  { name: 'outlineWidth', label: 'Outline thickness (px)', type: 'number', min: 0.5, max: 6, step: 0.5, half: true, default: 1.5, showIf: { field: 'textEffect', equals: 'outline' } },
  { name: 'textColor', label: 'Colour 1', type: 'color', half: true, default: '#FFFFFF' },
  { name: 'textColor2', label: 'Colour 2 (gradient end / glow)', type: 'color', half: true, default: '#E8C9A0', showIf: { field: 'textEffect', equals: ['gradient', 'glow'] } },
  { name: 'maxWidth', label: 'Max text width (px)', type: 'number', min: 200, max: 1600, half: true, default: 1100 },
  { name: 'lineHeight', label: 'Line height (e.g. 1.1)', type: 'number', min: 0.8, max: 2, step: 0.05, half: true, default: 1.08 },
  { name: 'letterSpacing', label: 'Letter spacing (em, e.g. 0 or 0.05)', type: 'number', min: -0.1, max: 0.6, step: 0.01, half: true, default: 0 },
  { name: 'uppercase', label: 'UPPERCASE', type: 'boolean', half: true },
  { name: 'italic', label: 'Italic', type: 'boolean', half: true },
  { name: 'textShadow', label: 'Soft shadow (readability over video)', type: 'boolean', half: true, default: true },
];

const heroAnimFields: Field[] = [
  { name: 'animation', label: 'Default entrance animation', type: 'select', half: true, default: 'fade-up', options: HERO_ANIM_OPTIONS },
  { name: 'animEasing', label: 'Motion style (easing)', type: 'select', half: true, default: 'smooth', options: [
    { value: 'smooth', label: 'Smooth (recommended)' }, { value: 'expo', label: 'Fast then gentle' }, { value: 'back', label: 'Slight overshoot' },
    { value: 'ease-out', label: 'Ease out' }, { value: 'ease-in-out', label: 'Ease in-out' }, { value: 'ease', label: 'Ease' }, { value: 'linear', label: 'Linear' } ] },
  { name: 'animDuration', label: 'Duration (seconds)', type: 'number', min: 0.1, max: 8, step: 0.1, half: true, default: 1.2 },
  { name: 'animDelay', label: 'Delay before it starts (seconds)', type: 'number', min: 0, max: 8, step: 0.1, half: true, default: 0.3 },
  { name: 'animStagger', label: 'Gap between letters / words (milliseconds)', type: 'number', min: 0, max: 600, step: 5, half: true, default: 45 },
  { name: 'animDistance', label: 'Movement distance (px) for slide / rise effects', type: 'number', min: 0, max: 300, half: true, default: 40 },
  { name: 'animRepeat', label: 'Play how many times? (1 = once each time the slide shows, 0 = loop forever)', type: 'number', min: 0, max: 50, half: true, default: 1 },
  { name: 'animRepeatGap', label: 'Pause before repeating (seconds)', type: 'number', min: 0, max: 30, step: 0.5, half: true, default: 2 },
  { name: 'animFadeOut', label: 'Fade out before each repeat', type: 'boolean', half: true, default: true },
];

export const SECTION_DEFS: SectionDef[] = [
  {
    type: 'hero',
    label: 'Hero / slider',
    description: 'Full-screen hero with a background video or image and one large line of text (size, alignment and style adjustable).',
    icon: 'GalleryHorizontal',
    category: 'Hero & layout',
    fields: [
      { name: '_hTop', label: '1 · Image at the top', type: 'heading', help: 'Shown centred above the Stays / Experiences links. A PNG with a transparent background works best.' },
      { name: 'topImage', label: 'Top image (PNG)', type: 'image' },
      { name: 'topImageWidth', label: 'Image width on desktop (px)', type: 'number', min: 40, max: 900, half: true, default: 220 },
      { name: 'topImageMobileWidth', label: 'Image width on mobile (px)', type: 'number', min: 30, max: 400, half: true, default: 150 },
      { name: 'topOffset', label: 'Distance from the top of the screen (px)', type: 'number', min: 0, max: 400, half: true, default: 96 },
      { name: 'topGap', label: 'Space between image and links (px)', type: 'number', min: 0, max: 200, half: true, default: 16 },

      { name: '_hTabs', label: '2 · Stays / Experiences links', type: 'heading' },
      { name: 'showTabs', label: 'Show the two switch links', type: 'boolean', default: false },
      { name: 'tab1Label', label: 'Link 1 text (shown by default)', type: 'text', half: true, default: 'Stays' },
      { name: 'tab2Label', label: 'Link 2 text', type: 'text', half: true, default: 'Experiences' },

      { name: '_hSlides', label: '3 · Slides', type: 'heading', help: 'Each slide = a background video or photo + either big text or an image on top. Drag to reorder.' },
      { name: 'slides', label: 'Set 1 slides — Stays (shown first)', type: 'list', itemLabel: 'heading', fields: slideFields, addLabel: 'Add a Stays slide' },
      { name: 'slides2', label: 'Set 2 slides — Experiences', type: 'list', itemLabel: 'heading', fields: slideFields, addLabel: 'Add an Experiences slide' },

      { name: '_hPos', label: '4 · Position of the text / image', type: 'heading', help: 'Start with the alignment, then nudge it: left/right (− = left, + = right) and up/down (− = up, + = down). Desktop and mobile are separate.' },
      { name: 'textAlign', label: 'Alignment', type: 'select', half: true, options: [
        { value: 'center', label: 'Center' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' } ], default: 'center' },
      { name: 'verticalAlign', label: 'Vertical position', type: 'select', half: true, options: [
        { value: 'center', label: 'Middle' }, { value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' } ] },
      { name: 'offsetX', label: 'Move left / right on desktop (px)', type: 'number', min: -800, max: 800, step: 5, half: true, default: 0 },
      { name: 'offsetY', label: 'Move up / down on desktop (px)', type: 'number', min: -600, max: 600, step: 5, half: true, default: 0 },
      { name: 'mobileOffsetX', label: 'Move left / right on mobile (px)', type: 'number', min: -300, max: 300, step: 5, half: true, default: 0 },
      { name: 'mobileOffsetY', label: 'Move up / down on mobile (px)', type: 'number', min: -400, max: 400, step: 5, half: true, default: 0 },

      { name: '_hText', label: '5 · Text style', type: 'heading', help: 'Applies to every text slide.' },
      ...heroTextFields,

      { name: '_hAnim', label: '6 · Animation', type: 'heading', help: 'How the text or image appears on each slide. Each slide can override the effect.' },
      ...heroAnimFields,

      { name: '_hBg', label: '7 · Background & timing', type: 'heading' },
      { name: 'height', label: 'Height', type: 'select', half: true, options: [
        { value: 'full', label: 'Full screen' }, { value: 'large', label: 'Large (75vh)' }, { value: 'medium', label: 'Medium (55vh)' } ], default: 'full' },
      { name: 'overlay', label: 'Darken background (%)', type: 'number', min: 0, max: 90, half: true, default: 35 },
      { name: 'autoplay', label: 'Seconds each photo stays (videos play to the end; 0 = no auto-advance)', type: 'number', min: 0, max: 30, half: true, default: 6 },
      { name: 'kenBurns', label: 'Slow zoom on photos', type: 'boolean', half: true },
      { name: 'showScrollCue', label: 'Show scroll-down arrow', type: 'boolean', half: true },
      { name: '_hHomeLink', label: '8 · “Home” link (bottom-left of the image)', type: 'heading', help: 'Shown automatically on every page except the home page, so visitors can get back to Home.' },
      { name: 'homeLink', label: 'Home link', type: 'select', half: true, default: 'show', options: [{ value: 'show', label: 'Show' }, { value: 'hide', label: 'Hide on this page' }] },
      { name: 'homeLinkLabel', label: 'Link text', type: 'text', half: true, default: 'Home' },
    ],
  },
  {
    type: 'split',
    label: 'Split image / text',
    description: 'Eyebrow → heading → body → bullets → buttons beside an image, gallery or two images.',
    icon: 'Columns2',
    category: 'Hero & layout',
    fields: [
      F.eyebrow, F.heading, F.body,
      { name: 'bullets', label: 'Bullet points', type: 'tags', help: 'Press Enter after each bullet' },
      F.ctas,
      { name: 'media', label: 'Media style', type: 'select', half: true, options: [
        { value: 'image', label: 'Single image' }, { value: 'gallery', label: 'Image + gallery thumbnails (lightbox)' }, { value: 'two', label: 'Two stacked images' }, { value: 'slider', label: 'Image slider' } ] },
      { name: 'imagePosition', label: 'Image position', type: 'select', half: true, options: [
        { value: 'right', label: 'Right' }, { value: 'left', label: 'Left' } ] },
      { name: 'image', label: 'Main image', type: 'image' },
      { name: 'gallery', label: 'Gallery / extra images (used by the gallery, two-image and slider styles)', type: 'images' },
      { name: 'sliderAutoplay', label: 'Slider: change image every (seconds, 0 = only with arrows)', type: 'number', min: 0, max: 30, half: true, default: 5, showIf: { field: 'media', equals: 'slider' } },
      ...styleFields,
    ],
  },
  {
    type: 'ctaBand',
    label: 'CTA band',
    description: 'Highlighted band (e.g. Workation) with background image or two images and buttons.',
    icon: 'Megaphone',
    category: 'Hero & layout',
    fields: [
      F.eyebrow, F.heading, { name: 'text', label: 'Text', type: 'textarea' }, F.ctas,
      { name: 'layout', label: 'Layout', type: 'select', half: true, options: [
        { value: 'images', label: 'Text + two images' }, { value: 'background', label: 'Text over background image' }, { value: 'plain', label: 'Plain colored band' } ] },
      { name: 'backgroundImage', label: 'Background image', type: 'image' },
      { name: 'images', label: 'Side images (2)', type: 'images' },
      ...styleFields,
    ],
  },
  {
    type: 'richText',
    label: 'Rich text',
    description: 'Free-form formatted text: headings, lists, tables, links, images.',
    icon: 'FileText',
    category: 'Content',
    fields: [F.eyebrow, F.heading, { name: 'content', label: 'Content', type: 'richtext' },
      { name: 'width', label: 'Width', type: 'select', half: true, options: [{ value: 'narrow', label: 'Narrow (reading)' }, { value: 'wide', label: 'Wide' }] },
      ...styleFields],
  },
  {
    type: 'featureList',
    label: 'Feature list',
    description: 'Icon + title + text items as a grid, carousel or checklist (e.g. "Your Sanctuary").',
    icon: 'ListChecks',
    category: 'Content',
    fields: [...headingFields,
      { name: 'layout', label: 'Layout', type: 'select', half: true, options: [
        { value: 'grid', label: 'Icon grid' }, { value: 'carousel', label: 'Carousel with arrows' }, { value: 'checklist', label: 'Checklist beside image' }, { value: 'tiles', label: 'Feature tiles' } ] },
      { name: 'columns', label: 'Columns', type: 'select', half: true, options: [{ value: '3', label: '3' }, { value: '4', label: '4' }, { value: '2', label: '2' }] },
      { name: 'image', label: 'Image (checklist layout)', type: 'image' },
      { name: 'items', label: 'Items', type: 'list', itemLabel: 'title', fields: [
        { name: 'icon', label: 'Icon', type: 'icon', half: true }, { name: 'title', label: 'Title', type: 'text', half: true }, { name: 'text', label: 'Text', type: 'textarea' } ] },
      F.ctas, ...styleFields],
  },
  {
    type: 'cardGrid',
    label: 'Card grid',
    description: 'Cards with image, tag, title, text, price and link (packages, highlights…).',
    icon: 'LayoutGrid',
    category: 'Content',
    fields: [...headingFields,
      { name: 'columns', label: 'Columns', type: 'select', half: true, options: [{ value: '3', label: '3' }, { value: '2', label: '2' }, { value: '4', label: '4' }] },
      { name: 'cards', label: 'Cards', type: 'list', itemLabel: 'title', fields: [
        { name: 'image', label: 'Image', type: 'image' },
        { name: 'tag', label: 'Tag', type: 'text', half: true }, { name: 'price', label: 'Price / note', type: 'text', half: true },
        { name: 'title', label: 'Title', type: 'text' }, { name: 'text', label: 'Text', type: 'textarea' },
        { name: 'features', label: 'Feature bullets', type: 'tags' },
        { name: 'cta', label: 'Button', type: 'cta' } ] },
      F.ctas, ...styleFields],
  },
  {
    type: 'stats',
    label: 'Stats / impact counters',
    description: 'Animated count-up numbers with text and optional image.',
    icon: 'ChartColumn',
    category: 'Content',
    fields: [F.eyebrow, F.heading, F.body,
      { name: 'image', label: 'Image', type: 'image' },
      { name: 'source', label: 'Numbers source', type: 'select', half: true, options: [{ value: 'manual', label: 'Items below' }, { value: 'collection', label: 'Stats collection' }] },
      { name: 'group', label: 'Stats collection group', type: 'text', half: true, help: 'e.g. "community"' },
      { name: 'items', label: 'Items', type: 'list', itemLabel: 'label', fields: [
        { name: 'value', label: 'Value', type: 'number', half: true }, { name: 'suffix', label: 'Suffix (+, k, %)', type: 'text', half: true }, { name: 'label', label: 'Label', type: 'text' } ] },
      F.ctas, ...styleFields],
  },
  {
    type: 'timeline',
    label: 'Timeline',
    description: 'Milestones with year, title, text and image.',
    icon: 'Milestone',
    category: 'Content',
    fields: [...headingFields, { name: 'items', label: 'Milestones', type: 'list', itemLabel: 'title', fields: [
      { name: 'year', label: 'Year', type: 'text', half: true }, { name: 'title', label: 'Title', type: 'text', half: true },
      { name: 'text', label: 'Text', type: 'textarea' }, { name: 'image', label: 'Image', type: 'image' } ] }, ...styleFields],
  },
  {
    type: 'table',
    label: 'Table',
    description: 'Simple data table (timings, prices…).',
    icon: 'Table',
    category: 'Content',
    fields: [...headingFields, { name: 'columns', label: 'Column headings', type: 'tags' },
      { name: 'rows', label: 'Rows', type: 'list', itemLabel: 'cells', fields: [{ name: 'cells', label: 'Cells (one per column, in order)', type: 'tags' }] },
      { name: 'note', label: 'Note under table', type: 'textarea' }, ...styleFields],
  },
  {
    type: 'faq',
    label: 'FAQ accordion',
    description: 'FAQs assigned to this page, a category or all.',
    icon: 'CircleHelp',
    category: 'Content',
    fields: [...headingFields,
      { name: 'mode', label: 'Which FAQs', type: 'select', half: true, options: [{ value: 'page', label: 'FAQs assigned to this page' }, { value: 'category', label: 'One category' }, { value: 'all', label: 'All' }] },
      { name: 'categoryId', label: 'Category', type: 'select', source: 'faqCategories', half: true },
      { name: 'limit', label: 'Max items (0 = all)', type: 'number', min: 0, half: true }, ...styleFields],
  },
  {
    type: 'faqBrowser',
    label: 'FAQ browser (tabs + search)',
    description: 'All FAQ categories as tabs with live search.',
    icon: 'Search',
    category: 'Content',
    fields: [...headingFields, { name: 'searchPlaceholder', label: 'Search placeholder', type: 'text' }, ...styleFields],
  },
  {
    type: 'gallery',
    label: 'Gallery',
    description: 'Masonry or grid gallery with lightbox.',
    icon: 'Images',
    category: 'Media',
    fields: [...headingFields, { name: 'images', label: 'Images', type: 'images' },
      { name: 'layout', label: 'Layout', type: 'select', half: true, options: [{ value: 'masonry', label: 'Masonry' }, { value: 'grid', label: 'Grid' }] },
      { name: 'columns', label: 'Columns (desktop)', type: 'select', half: true, options: [{ value: '3', label: '3' }, { value: '4', label: '4' }, { value: '2', label: '2' }] },
      ...styleFields],
  },
  {
    type: 'video',
    label: 'Video',
    description: 'YouTube, Vimeo or MP4 with poster image.',
    icon: 'CirclePlay',
    category: 'Media',
    fields: [...headingFields, { name: 'url', label: 'Video URL', type: 'url', required: true }, { name: 'poster', label: 'Poster image', type: 'image' }, ...styleFields],
  },
  {
    type: 'videoReviews',
    label: 'Guest video reviews (reels)',
    description: 'Vertical 9:16 guest review videos with sound. Visitors hover the left / right edge to slide, click a video to play it.',
    icon: 'Clapperboard',
    category: 'Media',
    fields: [...headingFields,
      { name: '_hReviews', label: 'Videos', type: 'heading', help: 'Upload vertical (Instagram-reel, 9:16) MP4 videos — they keep their sound. A poster image is optional; without one the first frame is shown.' },
      { name: 'items', label: 'Video reviews', type: 'list', itemLabel: 'name', addLabel: 'Add a video review', fields: [
        { name: 'video', label: 'Review video (9:16 MP4 / WebM, with sound)', type: 'video' },
        { name: 'poster', label: 'Cover image (optional)', type: 'image' },
        { name: 'name', label: 'Guest name', type: 'text', half: true },
        { name: 'location', label: 'From (city / country)', type: 'text', half: true },
        { name: 'caption', label: 'Short quote (optional)', type: 'textarea' },
        { name: 'rating', label: 'Star rating (0 = hide)', type: 'number', min: 0, max: 5, half: true, default: 5 },
      ] },
      { name: '_hReviewsBehaviour', label: 'Behaviour', type: 'heading' },
      { name: 'perView', label: 'Videos visible on desktop', type: 'select', half: true, default: '4', options: [{ value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' }] },
      { name: 'hoverPreview', label: 'Silent preview while the mouse is over a video', type: 'boolean', half: true, default: true },
      { name: 'edgeHover', label: 'Slide when hovering the left / right edge', type: 'boolean', half: true, default: true },
      ...styleFields],
  },
  {
    type: 'instagram',
    label: 'Instagram grid',
    description: 'Manual Instagram posts (collection) or live feed via access token (Site Settings → Instagram).',
    icon: 'Instagram',
    category: 'Media',
    fields: [F.eyebrow, F.heading, { name: 'count', label: 'Number of posts', type: 'number', min: 3, max: 12, half: true },
      { name: 'buttonLabel', label: 'Button label', type: 'text', half: true }, ...styleFields],
  },
  {
    type: 'testimonials',
    label: 'Testimonials + featured in',
    description: 'Testimonials slider, "As featured in" logo marquee and community photos.',
    icon: 'Quote',
    category: 'Collections',
    fields: [...headingFields,
      { name: 'showMentions', label: 'Show "As featured in" logos', type: 'boolean', half: true },
      { name: 'mentionsHeading', label: 'Logos heading', type: 'text', half: true },
      { name: 'communityHeading', label: 'Community photos heading', type: 'text' },
      { name: 'communityPhotos', label: 'Community photos', type: 'images' }, ...styleFields],
  },
  {
    type: 'mediaMentions',
    label: 'Featured-in logo marquee',
    description: 'Scrolling strip of media logos (Media Mentions collection).',
    icon: 'Newspaper',
    category: 'Collections',
    fields: [F.eyebrow, F.heading, ...styleFields],
  },
  {
    type: 'activities',
    label: 'Activities',
    description: 'Activity cards from the Activities collection with Featured / Seasonal filters.',
    icon: 'Mountain',
    category: 'Collections',
    fields: [...headingFields,
      { name: 'filter', label: 'Show', type: 'select', half: true, options: [{ value: 'all', label: 'All' }, { value: 'featured', label: 'Featured only' }, { value: 'seasonal', label: 'Seasonal only' }] },
      { name: 'limit', label: 'Max items (0 = all)', type: 'number', min: 0, half: true },
      { name: 'showFilters', label: 'Show tag filter buttons', type: 'boolean', half: true }, F.ctas, ...styleFields],
  },
  {
    type: 'specialArrangements',
    label: 'Special arrangements',
    description: 'Add-on experiences with price and detail modal.',
    icon: 'Gift',
    category: 'Collections',
    fields: [...headingFields, { name: 'limit', label: 'Max items (0 = all)', type: 'number', min: 0, half: true }, F.ctas, ...styleFields],
  },
  {
    type: 'staysGrid',
    label: 'Stay types',
    description: 'Cards for every stay type (Stays collection).',
    icon: 'Tent',
    category: 'Collections',
    fields: [...headingFields, ...styleFields],
  },
  {
    type: 'rooms',
    label: 'Room / unit cards',
    description: 'Rooms of one stay type with carousel, size, view, features and Book Now.',
    icon: 'BedDouble',
    category: 'Collections',
    fields: [...headingFields, { name: 'stayId', label: 'Stay type', type: 'select', source: 'stays', required: true }, ...styleFields],
  },
  {
    type: 'amenities',
    label: 'Amenities',
    description: 'Amenities collection as carousel or grid, filtered by group.',
    icon: 'Sparkles',
    category: 'Collections',
    fields: [...headingFields, { name: 'group', label: 'Amenity group', type: 'select', source: 'amenityGroups', half: true },
      { name: 'layout', label: 'Layout', type: 'select', half: true, options: [{ value: 'carousel', label: 'Carousel' }, { value: 'grid', label: 'Grid' }] }, ...styleFields],
  },
  {
    type: 'awards',
    label: 'Awards',
    description: 'Awards collection as a badge strip or detailed cards.',
    icon: 'Award',
    category: 'Collections',
    fields: [...headingFields, { name: 'style', label: 'Style', type: 'select', half: true, options: [{ value: 'strip', label: 'Badge strip' }, { value: 'cards', label: 'Cards with year' }] }, F.ctas, ...styleFields],
  },
  {
    type: 'team',
    label: 'Team',
    description: 'Team members collection.',
    icon: 'Users',
    category: 'Collections',
    fields: [...headingFields, ...styleFields],
  },
  {
    type: 'spaTreatments',
    label: 'Spa treatments',
    description: 'Treatment list with duration and price.',
    icon: 'Flower2',
    category: 'Collections',
    fields: [...headingFields, { name: 'category', label: 'Only this category (blank = all)', type: 'text', half: true }, { name: 'note', label: 'Booking note', type: 'richtext' }, ...styleFields],
  },
  {
    type: 'cafeTimings',
    label: 'Café timings table',
    description: 'Meal, hours and last order from Café Timings.',
    icon: 'Clock',
    category: 'Collections',
    fields: [...headingFields, { name: 'note', label: 'Note', type: 'textarea' }, ...styleFields],
  },
  {
    type: 'cafeMenu',
    label: 'Café menu',
    description: 'On-page menu (categories → items) with veg/vegan badges and a downloadable PDF.',
    icon: 'UtensilsCrossed',
    category: 'Collections',
    fields: [...headingFields, { name: 'pdf', label: 'Menu PDF', type: 'file' }, { name: 'pdfLabel', label: 'PDF button label', type: 'text', half: true }, ...styleFields],
  },
  {
    type: 'latestPosts',
    label: 'Latest blog posts',
    description: 'Most recent published posts.',
    icon: 'Newspaper',
    category: 'Collections',
    fields: [...headingFields, { name: 'count', label: 'Number of posts', type: 'number', min: 1, max: 12, half: true }, F.ctas, ...styleFields],
  },
  {
    type: 'contactDetails',
    label: 'Contact details + form',
    description: 'Phones, email, address (from Site Settings) beside the enquiry form.',
    icon: 'Contact',
    category: 'Forms & contact',
    fields: [...headingFields, { name: 'showForm', label: 'Show enquiry form', type: 'boolean', half: true },
      { name: 'formHeading', label: 'Form heading', type: 'text', half: true }, { name: 'formIntro', label: 'Form intro', type: 'textarea' }, ...styleFields],
  },
  {
    type: 'enquiryForm',
    label: 'Enquiry form',
    description: 'Booking enquiry form (saved to Enquiries + emailed).',
    icon: 'Send',
    category: 'Forms & contact',
    fields: [...headingFields, { name: 'submitLabel', label: 'Submit label', type: 'text', half: true }, { name: 'successMessage', label: 'Success message', type: 'text', half: true }, ...styleFields],
  },
  {
    type: 'map',
    label: 'Map & directions',
    description: 'Google Maps embed, directions rich text and static map image.',
    icon: 'MapPin',
    category: 'Forms & contact',
    fields: [...headingFields, { name: 'embedUrl', label: 'Google Maps embed URL', type: 'url', help: 'Google Maps → Share → Embed a map → copy the src URL' },
      { name: 'directions', label: 'Directions to reach', type: 'richtext' }, { name: 'staticImage', label: 'Static map image', type: 'image' }, ...styleFields],
  },
  {
    type: 'newsletter',
    label: 'Newsletter signup',
    description: 'Email signup band (saved to Subscribers).',
    icon: 'Mail',
    category: 'Forms & contact',
    fields: [F.eyebrow, F.heading, { name: 'text', label: 'Text', type: 'textarea' }, { name: 'buttonLabel', label: 'Button label', type: 'text' }, ...styleFields],
  },
];

/** Home page Stays / Experiences switch: every block (except the hero) can be tied to one of the two links. */
export const SHOW_ON_FIELDS: Field[] = [
  { name: '_hShowOn', label: 'Stays / Experiences switch (home page)', type: 'heading', help: 'Choose when this section appears on a page whose hero has the Stays / Experiences links. On other pages leave it on “Always”.' },
  { name: 'showOn', label: 'Show this section', type: 'select', required: true, default: 'always', options: [
    { value: 'always', label: 'Always' },
    { value: 'tab1', label: 'Only when Stays (link 1) is selected' },
    { value: 'tab2', label: 'Only when Experiences (link 2) is selected' },
  ] },
];
/** Text sizes, per section, in % of the theme size (100 = normal). Only the size changes — alignment stays as it is. */
export const TEXT_SIZE_FIELDS: Field[] = [
  { name: '_hTextSizes', label: 'Text sizes', type: 'heading', help: '100 = normal size (set in Theme). 150 = one and a half times bigger, 80 = smaller. Alignment and layout stay the same.' },
  { name: 'sizeEyebrow', label: 'Small label above the heading (e.g. “GLAMPING DOME”) %', type: 'number', min: 30, max: 400, step: 5, half: true, default: 100 },
  { name: 'sizeHeading', label: 'Main heading %', type: 'number', min: 30, max: 300, step: 5, half: true, default: 100 },
  { name: 'sizeBody', label: 'Paragraph, intro & list text %', type: 'number', min: 50, max: 250, step: 5, half: true, default: 100 },
  { name: 'sizeTitle', label: 'Card / item titles %', type: 'number', min: 50, max: 250, step: 5, half: true, default: 100 },
];
for (const d of SECTION_DEFS) if (d.type !== 'hero') d.fields.push(...TEXT_SIZE_FIELDS, ...SHOW_ON_FIELDS);

export const SECTION_MAP: Record<string, SectionDef> = Object.fromEntries(SECTION_DEFS.map((d) => [d.type, d]));

export function getSectionDef(type: string): SectionDef | undefined {
  return SECTION_MAP[type];
}
