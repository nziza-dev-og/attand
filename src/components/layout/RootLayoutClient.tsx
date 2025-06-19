
"use client"; // This component handles client-side logic

import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AppProvider, useApp as useAppComponent } from '@/contexts/AppContext';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseMessagingInitializer } from '@/components/shared/FirebaseMessagingInitializer';
import InstallPrompt from '@/components/shared/InstallPrompt';

// Client component to handle PWA install prompt logic
function PwaInstallHandlerController({ children }: { children: ReactNode }) {
  const { setDeferredInstallPromptEvent } = useAppComponent();

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      console.log('beforeinstallprompt event fired!');
      event.preventDefault(); // Prevent the default mini-infobar
      setDeferredInstallPromptEvent(event);
    };

    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is already running in standalone mode, not setting up prompt listener.');
    } else {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      console.log('PwaInstallHandlerController: beforeinstallprompt event listener added.');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      console.log('PwaInstallHandlerController: beforeinstallprompt event listener removed.');
    };
  }, [setDeferredInstallPromptEvent]);

  return <>{children}</>;
}

export function RootLayoutClient({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppProvider>
          <PwaInstallHandlerController>
            <FirebaseMessagingInitializer />
            {children}
            <InstallPrompt />
          </PwaInstallHandlerController>
        </AppProvider>
        <Toaster />
      </LanguageProvider>
    </AuthProvider>
  );
}
