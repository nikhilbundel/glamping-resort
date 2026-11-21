'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react';
import type { ImageValue, MenuNode } from '@/lib/types';
import { cn, isExternal } from '@/lib/utils';

type Props = {
  siteName: string;
  logoLight: ImageValue | null;
  logoDark: ImageValue | null;
  logoHeight: number;
  header: MenuNode[];
  utility: MenuNode[];
  booking: { href: string; label: string; newTab: boolean };
  announcement: { text: string; linkLabel: string; linkUrl: string; bgColor: string; textColor: string } | null;
  options: { showLogo: boolean; showContact: boolean; contactPosition?: 'left' | 'right'; contactLabel: string; contactUrl: string; showBookNow: boolean; showMainMenu: boolean; showUtilityBar: boolean; transparentOverHero: boolean };
};

function NavLink({ item, className, onClick }: { item: MenuNode; className?: string; onClick?: () => void }) {
  const ext = isExternal(item.href) || item.newTab;
  if (ext)
    return (
      <a href={item.href} className={className} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noopener noreferrer' : undefined} onClick={onClick}>
        {item.label}
      </a>
    );
  return (
    <Link href={item.href || '#'} className={className} onClick={onClick}>
      {item.label}
    </Link>
  );
}

function Logo({ img, fallback, height, className }: { img: ImageValue | null; fallback: string; height: number; className?: string }) {
  if (!img?.url) return <span className={cn('font-heading text-2xl font-semibold tracking-wide', className)}>{fallback}</span>;
  const w = img.width && img.height ? Math.round((img.width / img.height) * height) : height * 3;
  return <Image src={img.url} unoptimized={img.url.endsWith(".svg")} alt={img.alt || fallback} width={w} height={height} priority className={cn('max-w-[38vw] object-contain object-left sm:max-w-none', className)} style={{ height, width: 'auto' }} />;
}

export function Header({ siteName, logoLight, logoDark, logoHeight, header, utility, booking, announcement, options }: Props) {
  const pathname = usePathname();
  const [hasHero, setHasHero] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [desktopOpen, setDesktopOpen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHasHero(!!document.querySelector('[data-hero]'));
    setOpen(false);
    setDesktopOpen(null);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => setHeight(e.contentRect.height));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setDesktopOpen(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const solid = scrolled || !hasHero || options.transparentOverHero === false;
  const showMenu = options.showMainMenu && header.length > 0;
  const showUtility = options.showUtilityBar && (utility.length > 0 || options.showBookNow);
  const contactLeft = options.contactPosition !== 'right';
  const contactLink =
    options.showContact && options.contactLabel ? (
      <NavLink
        item={{ id: 'contact', label: options.contactLabel, href: options.contactUrl || '/contact' }}
        className={cn('inline-flex min-h-[44px] items-center text-[11px] font-medium uppercase tracking-[0.12em] transition hover:text-accent sm:text-sm sm:tracking-[0.15em]', contactLeft ? 'px-0' : 'px-1.5 sm:px-3', pathname === options.contactUrl && 'text-accent')}
      />
    ) : null;
  const bookingExternal = isExternal(booking.href);

  return (
    <>
      <div ref={wrapRef} className="fixed inset-x-0 top-0 z-50">
        {announcement && (
          <div className="px-4 py-2 text-center text-sm" style={{ background: announcement.bgColor, color: announcement.textColor }}>
            {announcement.text}{' '}
            {announcement.linkUrl && (
              <a href={announcement.linkUrl} className="ml-1 font-medium underline underline-offset-4">
                {announcement.linkLabel || 'Learn more'}
              </a>
            )}
          </div>
        )}
        <header data-over-hero={solid ? undefined : ''} className={cn('transition-colors duration-500', solid ? 'bg-surface/95 text-ink shadow-soft backdrop-blur' : 'bg-gradient-to-b from-black/50 to-transparent text-white')}>
          {/* Utility bar (optional) */}
          {showUtility && (
          <div className={cn('hidden overflow-hidden border-b transition-all duration-300 lg:block', solid ? 'max-h-0 border-transparent' : 'max-h-12 border-white/15')}>
            <div className="container flex h-10 items-center justify-end gap-6 text-xs uppercase tracking-[0.15em]">
              {utility.map((u) => (
                <NavLink key={u.id} item={u} className="opacity-90 transition hover:opacity-100 hover:text-accent" />
              ))}
              <a href={booking.href} target={booking.newTab ? '_blank' : undefined} rel={bookingExternal ? 'noopener noreferrer' : undefined} className="rounded-btn bg-btn px-4 py-1.5 text-btn-ink transition hover:brightness-110">
                {booking.label}
              </a>
            </div>
          </div>
          )}

          <nav aria-label="Main" className="container flex h-[72px] items-center justify-between gap-3 lg:h-20">
            <div className="flex min-w-0 items-center gap-3 sm:gap-6">
              {options.showLogo ? (
                <Link href="/" className="flex min-w-0 shrink items-center" aria-label={`${siteName} home`}>
                  <Logo img={solid ? logoDark || logoLight : logoLight || logoDark} fallback={siteName} height={logoHeight} />
                </Link>
              ) : (
                <Link href="/" className="sr-only focus:not-sr-only focus:rounded focus:px-2 focus:py-1">
                  {siteName} home
                </Link>
              )}
              {contactLeft && contactLink}
            </div>

            {showMenu && (
            <ul className="hidden items-center gap-1 lg:flex">
              {header.map((item) => {
                const hasKids = !!item.children?.length;
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <li
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => hasKids && setDesktopOpen(item.id)}
                    onMouseLeave={() => hasKids && setDesktopOpen(null)}
                  >
                    <div className="flex items-center">
                      <NavLink item={item} className={cn('px-3 py-2 text-[15px] tracking-wide transition hover:text-accent', active && 'text-accent')} />
                      {hasKids && (
                        <button
                          type="button"
                          aria-label={`Open ${item.label} submenu`}
                          aria-expanded={desktopOpen === item.id}
                          onClick={() => setDesktopOpen(desktopOpen === item.id ? null : item.id)}
                          className="-ml-2 p-1"
                        >
                          <ChevronDown className={cn('h-4 w-4 transition-transform', desktopOpen === item.id && 'rotate-180')} />
                        </button>
                      )}
                    </div>
                    {hasKids && desktopOpen === item.id && (
                      <ul className="absolute left-0 top-full min-w-[220px] rounded-card border border-line bg-surface py-2 text-ink shadow-lift">
                        {item.children!.map((c) => (
                          <li key={c.id}>
                            <NavLink item={c} className="block px-5 py-2.5 text-sm transition hover:bg-bg hover:text-accent" onClick={() => setDesktopOpen(null)} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-4">
              {!contactLeft && contactLink}
              {options.showBookNow && (
                <a href={booking.href} target={booking.newTab ? '_blank' : undefined} rel={bookingExternal ? 'noopener noreferrer' : undefined} className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-btn bg-btn px-3 text-[11px] font-medium uppercase tracking-[0.1em] text-btn-ink shadow-soft transition hover:-translate-y-0.5 hover:brightness-110 sm:px-6 sm:text-sm sm:tracking-[0.12em]">
                  {booking.label}
                </a>
              )}
              {showMenu && (
                <button type="button" className="inline-flex h-11 w-11 items-center justify-center lg:hidden" aria-label="Open menu" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)}>
                  <MenuIcon className="h-6 w-6" />
                </button>
              )}
            </div>
          </nav>
        </header>
      </div>
      {/* Spacer for pages that don't start with a full-bleed hero */}
      {!hasHero && <div aria-hidden="true" style={{ height }} />}

      {/* Mobile full-screen menu */}
      {showMenu && (
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={cn('fixed inset-0 z-[60] flex flex-col bg-primary-dark text-white transition-[transform,visibility] duration-500 lg:hidden', open ? 'visible translate-x-0' : 'invisible translate-x-full')}
        aria-hidden={!open}
      >
        <div className="flex h-[72px] items-center justify-between px-5">
          <Logo img={logoLight || logoDark} fallback={siteName} height={Math.min(logoHeight, 40)} />
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="inline-flex h-11 items-center gap-2 px-2 text-sm uppercase tracking-[0.15em]" tabIndex={open ? 0 : -1}>
            Close <X className="h-6 w-6" />
          </button>
        </div>
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 pb-10">
          <ul className="divide-y divide-white/10">
            {header.map((item) => (
              <li key={item.id} className="py-1">
                <div className="flex items-center justify-between">
                  <NavLink item={item} className="block py-3 font-heading text-2xl" onClick={() => setOpen(false)} />
                  {!!item.children?.length && (
                    <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label={`Toggle ${item.label}`} aria-expanded={openSub === item.id} onClick={() => setOpenSub(openSub === item.id ? null : item.id)} tabIndex={open ? 0 : -1}>
                      <ChevronDown className={cn('h-5 w-5 transition-transform', openSub === item.id && 'rotate-180')} />
                    </button>
                  )}
                </div>
                {!!item.children?.length && (
                  <div className={cn('grid overflow-hidden pl-4 transition-all duration-300', openSub === item.id ? 'grid-rows-[1fr] pb-3' : 'grid-rows-[0fr]')}>
                    <ul className="min-h-0">
                      {item.children.map((c) => (
                        <li key={c.id}>
                          <NavLink item={c} className="block py-2.5 text-white/80" onClick={() => setOpen(false)} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm uppercase tracking-[0.15em] text-white/70">
            {utility.map((u) => (
              <li key={u.id}>
                <NavLink item={u} className="inline-block py-2" onClick={() => setOpen(false)} />
              </li>
            ))}
          </ul>
          <a href={booking.href} target={booking.newTab ? '_blank' : undefined} rel={bookingExternal ? 'noopener noreferrer' : undefined} className="mt-8 flex min-h-[48px] items-center justify-center rounded-btn bg-btn text-btn-ink">
            {booking.label}
          </a>
        </nav>
      </div>
      )}
    </>
  );
}
