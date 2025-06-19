
import type { Metadata, Viewport } from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { RootLayoutClient } from '@/components/layout/RootLayoutClient'; // Import the new client component

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'AttendEase',
  description: 'Streamlined attendance tracking for schools.',
  manifest: "/manifest.json",
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E0F7FA' },
    { media: '(prefers-color-scheme: dark)', color: '#005060' },
  ],
  appleWebApp: {
    capable: true,
    title: "AttendEase",
    statusBarStyle: "default",
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E0F7FA' },
    { media: '(prefers-color-scheme: dark)', color: '#005060' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
