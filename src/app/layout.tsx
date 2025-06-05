
import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { AuthProvider, useAuth } from '@/hooks/useAuth'; // Corrected import path
import { LanguageProvider } from '@/contexts/LanguageContext'; // Import LanguageProvider
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase'; // Import FCM functions
import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';


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

// Client component to handle FCM logic
function FirebaseMessagingSetup() {
  const { user } = useAuth(); // Get user from AuthContext
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.Worker) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
          // Request permission only if user is logged in
          if (user) {
            requestNotificationPermission().then(token => {
              if (token) {
                // TODO: Send this token to your backend server associated with the user
                console.log('FCM Token obtained in layout:', token);
              }
            });
          }
        }).catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }
  }, [user]); // Re-run when user state changes

  useEffect(() => {
    // Listen for foreground messages
    if (user) { // Only listen if user is logged in
      const unsubscribe = onMessageListener()
        .then((payload: any) => {
            toast({
              title: payload?.notification?.title || "New Message",
              description: payload?.notification?.body || "You have a new message.",
            });
        })
        .catch(err => console.error('failed to listen for foreground message', err));
      
      // Type assertion for unsubscribe if it's a function, otherwise, it might be a promise.
      // This part needs careful handling depending on what onMessageListener truly returns.
      // For now, assuming it might return an unsubscribe function directly or within a promise.
      return () => {
        if (typeof unsubscribe === 'function') {
          (unsubscribe as () => void)();
        } else if (unsubscribe && typeof (unsubscribe as any).then !== 'function' && typeof (unsubscribe as any) === 'function') {
            // If it's a promise that resolves to an unsubscribe function
            Promise.resolve(unsubscribe).then(unsub => {
              if (typeof unsub === 'function') (unsub as () => void)();
            });
        }
      };
    }
  }, [user, toast]);

  return null; // This component does not render anything
}


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
            <FirebaseMessagingSetup /> {/* Add FCM setup component */}
            {children}
            <Toaster />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
