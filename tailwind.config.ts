import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const v = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    container: { center: true, padding: { DEFAULT: '1.25rem', md: '2rem' }, screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        primary: { DEFAULT: v('primary'), dark: v('primary-dark') },
        accent: v('accent'),
        bg: v('bg'),
        surface: v('surface'),
        ink: v('text'),
        muted: v('muted'),
        line: v('border'),
        btn: { DEFAULT: v('button'), ink: v('button-text') },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        h1: ['calc(clamp(3rem, 2.2rem + 3.2vw, 5rem) * var(--ts-heading, 1) * var(--s-heading, 1))', { lineHeight: '1.05' }],
        h2: ['calc(clamp(2.125rem, 1.7rem + 1.8vw, 3.25rem) * var(--ts-heading, 1) * var(--s-heading, 1))', { lineHeight: '1.12' }],
        h3: ['calc(clamp(1.5rem, 1.35rem + 0.6vw, 1.875rem) * var(--ts-title, 1) * var(--s-title, 1))', { lineHeight: '1.25' }],
        body: ['calc(clamp(1rem, 0.95rem + 0.25vw, 1.125rem) * var(--ts-body, 1) * var(--s-body, 1))', { lineHeight: '1.7' }],
      },
      borderRadius: { card: 'var(--radius-card)', btn: 'var(--radius-btn)' },
      boxShadow: { soft: '0 10px 30px rgba(0,0,0,.06)', lift: '0 18px 40px rgba(0,0,0,.12)' },
      maxWidth: { site: '1280px' },
      keyframes: {
        kenburns: { '0%': { transform: 'scale(1)' }, '100%': { transform: 'scale(1.12)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        fadein: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      animation: { kenburns: 'kenburns 12s ease-out forwards', marquee: 'marquee 40s linear infinite', fadein: 'fadein .9s ease-out both' },
    },
  },
  plugins: [typography],
};
export default config;
