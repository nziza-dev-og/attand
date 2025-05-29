
import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth'; // Corrected import path
import { LanguageProvider } from '@/contexts/LanguageContext'; // Import LanguageProvider
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';

const fontSans = FontSans({
  subsets: ['latin'], // Kinyarwanda uses Latin script, 'latin' subset is generally fine.
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'AttendEase', // This could also be translated if needed at build time or dynamically
  description: 'Streamlined attendance tracking for schools.',
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
          <LanguageProvider> {/* Wrap with LanguageProvider */}
            {children}
            <Toaster />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
