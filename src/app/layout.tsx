import type { Metadata } from 'next';
// Replaced GeistSans with Inter as GeistSans is not directly available via next/font/google
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth.tsx';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';

// Configure Inter font
const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans', // Changed variable name to reflect Inter
});

export const metadata: Metadata = {
  title: 'AttendEase',
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
          fontSans.variable // Use the updated variable name
        )}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
