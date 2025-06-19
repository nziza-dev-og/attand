
import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth'; // Corrected import path
import { LanguageProvider } from '@/contexts/LanguageContext'; // Import LanguageProvider
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseMessagingInitializer } from '@/components/shared/FirebaseMessagingInitializer'; // Import the new client component

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'AttendEase',
  description: 'Streamlined attendance tracking for schools.',
  manifest: "/manifest.json",
  themeColor: [ // Support for light and dark mode theme-color
    { media: '(prefers-color-scheme: light)', color: '#E0F7FA' }, // Light Blue for light mode (matches manifest)
    { media: '(prefers-color-scheme: dark)', color: '#005060' }, // A darker teal/blue for dark mode status bar
  ],
  appleWebApp: {
    capable: true,
    title: "AttendEase",
    statusBarStyle: "default", // You can also use "black" or "black-translucent"
  },
  icons: {
    icon: '/favicon.ico', // Standard favicon
    apple: '/icons/apple-touch-icon.png', // Apple touch icon
  },
  // Helps prevent issues with touch delays on some mobile browsers
  // viewport: 'width=device-width, initial-scale=1, viewport-fit=cover', // Already good practice in Next.js
  // For PWA, it's good to ensure mobile-web-app-capable is set
  // This is handled by appleWebApp.capable for iOS.
  // For Android, the manifest's display: "standalone" handles this.
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
        <AuthProvider>
          <LanguageProvider>
            <FirebaseMessagingInitializer /> {/* Use the new client component here */}
            {children}
            <Toaster />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
