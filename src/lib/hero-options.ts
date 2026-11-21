/** Client-safe option lists for the home hero (fonts and animations). */

export type HeroFont = { name: string; group: 'Serif' | 'Sans-serif' | 'Display' | 'Script'; weights: string };

export const HERO_FONTS: HeroFont[] = [
  { name: 'Cormorant Garamond', group: 'Serif', weights: '300;400;500;600;700' },
  { name: 'Playfair Display', group: 'Serif', weights: '400;500;600;700;800;900' },
  { name: 'Bodoni Moda', group: 'Serif', weights: '400;500;600;700;800;900' },
  { name: 'DM Serif Display', group: 'Serif', weights: '400' },
  { name: 'Fraunces', group: 'Serif', weights: '300;400;500;600;700;800;900' },
  { name: 'Cinzel', group: 'Serif', weights: '400;500;600;700;800;900' },
  { name: 'Marcellus', group: 'Serif', weights: '400' },
  { name: 'Prata', group: 'Serif', weights: '400' },
  { name: 'Libre Baskerville', group: 'Serif', weights: '400;700' },
  { name: 'Lora', group: 'Serif', weights: '400;500;600;700' },
  { name: 'EB Garamond', group: 'Serif', weights: '400;500;600;700;800' },
  { name: 'Yeseva One', group: 'Serif', weights: '400' },
  { name: 'Abril Fatface', group: 'Serif', weights: '400' },
  { name: 'Italiana', group: 'Serif', weights: '400' },
  { name: 'Gilda Display', group: 'Serif', weights: '400' },
  { name: 'Montserrat', group: 'Sans-serif', weights: '100;200;300;400;500;600;700;800;900' },
  { name: 'Poppins', group: 'Sans-serif', weights: '100;200;300;400;500;600;700;800;900' },
  { name: 'Raleway', group: 'Sans-serif', weights: '100;200;300;400;500;600;700;800;900' },
  { name: 'Josefin Sans', group: 'Sans-serif', weights: '100;200;300;400;500;600;700' },
  { name: 'Jost', group: 'Sans-serif', weights: '100;200;300;400;500;600;700;800;900' },
  { name: 'Outfit', group: 'Sans-serif', weights: '100;200;300;400;500;600;700;800;900' },
  { name: 'Inter', group: 'Sans-serif', weights: '100;200;300;400;500;600;700;800;900' },
  { name: 'Tenor Sans', group: 'Sans-serif', weights: '400' },
  { name: 'Syne', group: 'Sans-serif', weights: '400;500;600;700;800' },
  { name: 'Space Grotesk', group: 'Sans-serif', weights: '300;400;500;600;700' },
  { name: 'Unbounded', group: 'Sans-serif', weights: '200;300;400;500;600;700;800;900' },
  { name: 'Bebas Neue', group: 'Display', weights: '400' },
  { name: 'Anton', group: 'Display', weights: '400' },
  { name: 'Oswald', group: 'Display', weights: '200;300;400;500;600;700' },
  { name: 'Archivo Black', group: 'Display', weights: '400' },
  { name: 'Righteous', group: 'Display', weights: '400' },
  { name: 'Lobster', group: 'Display', weights: '400' },
  { name: 'Monoton', group: 'Display', weights: '400' },
  { name: 'Great Vibes', group: 'Script', weights: '400' },
  { name: 'Dancing Script', group: 'Script', weights: '400;500;600;700' },
  { name: 'Pacifico', group: 'Script', weights: '400' },
  { name: 'Allura', group: 'Script', weights: '400' },
  { name: 'Sacramento', group: 'Script', weights: '400' },
  { name: 'Parisienne', group: 'Script', weights: '400' },
  { name: 'Satisfy', group: 'Script', weights: '400' },
  { name: 'Caveat', group: 'Script', weights: '400;500;600;700' },
  { name: 'Amatic SC', group: 'Script', weights: '400;700' },
];

export const HERO_FONT_OPTIONS = [
  { value: 'heading', label: 'Theme heading font (Admin → Theme)' },
  { value: 'body', label: 'Theme body font (Admin → Theme)' },
  ...HERO_FONTS.map((f) => ({ value: f.name, label: `${f.name} — ${f.group}` })),
];

export function heroFontHref(name?: string) {
  const f = HERO_FONTS.find((x) => x.name === name);
  if (!f) return null;
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.name).replace(/%20/g, '+')}:wght@${f.weights}&display=swap`;
}

export type HeroAnim = { value: string; label: string; split?: 'letters' | 'words'; keyframe: string };

export const HERO_ANIMATIONS: HeroAnim[] = [
  { value: 'none', label: 'None — appears instantly', keyframe: '' },
  { value: 'fade', label: 'Fade in', keyframe: 'hx-fade' },
  { value: 'fade-up', label: 'Fade up', keyframe: 'hx-fade-up' },
  { value: 'fade-down', label: 'Fade down', keyframe: 'hx-fade-down' },
  { value: 'fade-left', label: 'Slide in from the right', keyframe: 'hx-fade-left' },
  { value: 'fade-right', label: 'Slide in from the left', keyframe: 'hx-fade-right' },
  { value: 'zoom-in', label: 'Zoom in (grow into place)', keyframe: 'hx-zoom-in' },
  { value: 'zoom-out', label: 'Zoom out (shrink into place)', keyframe: 'hx-zoom-out' },
  { value: 'blur-in', label: 'Blur in', keyframe: 'hx-blur-in' },
  { value: 'reveal-up', label: 'Mask reveal — rise from a line', keyframe: 'hx-reveal-up' },
  { value: 'reveal-down', label: 'Mask reveal — drop from above', keyframe: 'hx-reveal-down' },
  { value: 'flip-up', label: '3D flip up', keyframe: 'hx-flip-up' },
  { value: 'rotate-in', label: 'Rotate in', keyframe: 'hx-rotate-in' },
  { value: 'tracking-in', label: 'Wide letter-spacing → settle', keyframe: 'hx-tracking-in' },
  { value: 'bounce-in', label: 'Bounce in', keyframe: 'hx-bounce-in' },
  { value: 'drop-in', label: 'Drop in from the top', keyframe: 'hx-drop-in' },
  { value: 'letters-fade', label: 'Letter by letter — fade', split: 'letters', keyframe: 'hx-fade' },
  { value: 'letters-up', label: 'Letter by letter — rise', split: 'letters', keyframe: 'hx-fade-up' },
  { value: 'letters-blur', label: 'Letter by letter — blur', split: 'letters', keyframe: 'hx-blur-in' },
  { value: 'letters-pop', label: 'Letter by letter — pop', split: 'letters', keyframe: 'hx-pop' },
  { value: 'words-up', label: 'Word by word — rise', split: 'words', keyframe: 'hx-fade-up' },
  { value: 'words-fade', label: 'Word by word — fade', split: 'words', keyframe: 'hx-fade' },
  { value: 'words-blur', label: 'Word by word — blur', split: 'words', keyframe: 'hx-blur-in' },
  { value: 'typewriter', label: 'Typewriter (with cursor)', split: 'letters', keyframe: 'hx-type' },
];

export const HERO_ANIM_OPTIONS = HERO_ANIMATIONS.map((a) => ({ value: a.value, label: a.label }));

export const HERO_EASINGS: Record<string, string> = {
  smooth: 'cubic-bezier(.22,1,.36,1)',
  expo: 'cubic-bezier(.16,1,.3,1)',
  ease: 'ease',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  linear: 'linear',
  back: 'cubic-bezier(.34,1.56,.64,1)',
};
