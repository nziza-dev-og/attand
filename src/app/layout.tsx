
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
  icons: {
    icon: '/favicon.ico', // Explicitly point to favicon.ico in the public directory
    // apple: '/apple-icon.png', // Example for Apple touch icon
  },
  manifest: "/manifest.json", // Add this for PWA capabilities / Service Worker
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
