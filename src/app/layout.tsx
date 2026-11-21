import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#2F4A3A' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
