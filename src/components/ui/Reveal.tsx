'use client';

import { LazyMotion, domAnimation, m, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const item: Variants = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } };

/**
 * Fade-up on scroll; children wrapped in <RevealItem> stagger.
 * Uses LazyMotion + `m` so only the small DOM-animation feature set ships to the browser.
 * Disabled for prefers-reduced-motion.
 */
export function Reveal({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'ul' }) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  const M = as === 'ul' ? m.ul : m.div;
  return (
    <LazyMotion features={domAnimation} strict>
      <M className={className} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
        {children}
      </M>
    </LazyMotion>
  );
}

export function RevealItem({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'li' }) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  const M = as === 'li' ? m.li : m.div;
  return (
    <LazyMotion features={domAnimation} strict>
      <M className={className} variants={item}>
        {children}
      </M>
    </LazyMotion>
  );
}
