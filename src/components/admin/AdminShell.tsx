'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { signOut } from 'next-auth/react';
import { icons, ExternalLink, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { COLLECTIONS } from '@/lib/collections';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: keyof typeof icons; superOnly?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const groups = Array.from(new Set(COLLECTIONS.map((c) => c.group)));

const NAV: NavGroup[] = [
  { label: '', items: [{ href: '/admin', label: 'Dashboard', icon: 'LayoutDashboard' }] },
  {
    label: 'Bookings',
    items: [
      { href: '/admin/bookings', label: 'Bookings', icon: 'CalendarCheck' },
      { href: '/admin/rates', label: 'Rates, guests & availability', icon: 'CalendarRange' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/pages', label: 'Pages & Sections', icon: 'Files' },
      { href: '/admin/menus', label: 'Menu Builder', icon: 'Menu' },
      { href: '/admin/media', label: 'Media Library', icon: 'Images' },
    ],
  },
  ...groups.map((g) => ({
    label: g,
    items: COLLECTIONS.filter((c) => c.group === g).map((c) => ({ href: `/admin/collections/${c.key}`, label: c.label, icon: (c.icon in icons ? c.icon : 'Circle') as keyof typeof icons })),
  })),
  {
    label: 'Leads',
    items: [
      { href: '/admin/enquiries', label: 'Enquiries', icon: 'Inbox' },
      { href: '/admin/subscribers', label: 'Newsletter', icon: 'Mail' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/admin/settings', label: 'Site Settings', icon: 'Settings' },
      { href: '/admin/theme', label: 'Theme', icon: 'Palette', superOnly: true },
      { href: '/admin/seo', label: 'SEO', icon: 'SearchCheck' },
      { href: '/admin/redirects', label: 'Redirects', icon: 'ArrowRightLeft' },
      { href: '/admin/users', label: 'Users & Roles', icon: 'Users', superOnly: true },
      { href: '/admin/activity', label: 'Activity Log', icon: 'History' },
      { href: '/admin/changes', label: 'Change Log (for Claude)', icon: 'ClipboardList' },
      { href: '/admin/backup', label: 'Backup & Restore', icon: 'DatabaseBackup', superOnly: true },
      { href: '/admin/account', label: 'My Account', icon: 'UserCog' },
    ],
  },
];

export function AdminShell({ user, children, newEnquiries }: { user: { name: string; email: string; role: Role }; children: ReactNode; newEnquiries: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      setDark(localStorage.getItem('admin-dark') === '1');
    } catch {}
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const toggleDark = () => {
    setDark((d) => {
      try {
        localStorage.setItem('admin-dark', d ? '0' : '1');
      } catch {}
      return !d;
    });
  };

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/admin" className="text-lg font-semibold tracking-tight">
          Resort <span className="text-emerald-600">CMS</span>
        </Link>
        <button type="button" className="rounded p-1.5 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {NAV.map((g) => {
          const items = g.items.filter((i) => !i.superOnly || user.role === 'SUPER_ADMIN');
          if (!items.length) return null;
          return (
            <div key={g.label || 'main'}>
              {g.label && <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{g.label}</p>}
              <ul className="space-y-0.5">
                {items.map((i) => {
                  const I = icons[i.icon] || icons.Circle;
                  return (
                    <li key={i.href}>
                      <Link href={i.href} aria-current={isActive(i.href) ? 'page' : undefined} className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition', isActive(i.href) ? 'bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800')}>
                        <I className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate">{i.label}</span>
                        {i.href === '/admin/enquiries' && newEnquiries > 0 && <span className="rounded-full bg-emerald-600 px-1.5 text-[11px] font-semibold text-white">{newEnquiries}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className={cn('admin-ui', dark && 'dark')}>
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-zinc-200 bg-white lg:block dark:border-zinc-800 dark:bg-zinc-900">{sidebar}</aside>
        {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}
        <aside className={cn('fixed inset-y-0 left-0 z-50 w-72 border-r border-zinc-200 bg-white transition-transform lg:hidden dark:border-zinc-800 dark:bg-zinc-900', open ? 'translate-x-0' : '-translate-x-full')} aria-hidden={!open}>
          {sidebar}
        </aside>
        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/90">
            <button type="button" className="rounded-lg p-2 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-800" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1" />
            <a href="/" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 sm:inline-flex dark:text-zinc-300 dark:hover:bg-zinc-800">
              View site <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button type="button" onClick={toggleDark} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="hidden text-right text-xs sm:block">
              <p className="font-medium">{user.name}</p>
              <p className="text-zinc-500">{user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Editor'}</p>
            </div>
            <button type="button" onClick={() => signOut({ callbackUrl: '/admin/login' })} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          </header>
          <main className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
