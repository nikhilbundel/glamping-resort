'use client';

import { useState } from 'react';
import { Facebook, Link2, Linkedin, MessageCircle, Twitter } from 'lucide-react';

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: 'Share on WhatsApp', href: `https://wa.me/?text=${t}%20${u}`, I: MessageCircle },
    { label: 'Share on Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, I: Facebook },
    { label: 'Share on X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, I: Twitter },
    { label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, I: Linkedin },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow mr-2 text-muted">Share</span>
      {links.map(({ label, href, I }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line transition hover:border-accent hover:bg-accent hover:text-white">
          <I className="h-4 w-4" aria-hidden="true" />
        </a>
      ))}
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm transition hover:border-accent"
      >
        <Link2 className="h-4 w-4" aria-hidden="true" /> {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}
