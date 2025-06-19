
"use client";
import React, { useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { useApp } from '@/contexts/AppContext'; // Corrected path based on typical project structure
import { useLanguage } from '@/contexts/LanguageContext'; // For translations
import { Button } from '@/components/ui/button'; // For styling the button
import { cn } from '@/lib/utils';

export default function InstallPrompt() {
  const { showInstallPrompt, hideInstallPrompt, deferredInstallPromptEvent } = useApp();
  const { translate } = useLanguage();

  useEffect(() => {
    const handleAppInstalled = () => {
      hideInstallPrompt();
      // Optionally clear the deferredInstallPromptEvent in context if needed,
      // though the browser typically handles this.
    };
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, [hideInstallPrompt]);

  const handleInstall = async () => {
    if (deferredInstallPromptEvent) {
      deferredInstallPromptEvent.prompt();
      // userChoice is a Promise, so await its result
      const { outcome } = await deferredInstallPromptEvent.userChoice;
      if (outcome === 'accepted') {
        // console.log('User accepted the A2HS prompt');
        // Toast message handled by AppHeader in previous implementation, can be added here if desired
      } else {
        // console.log('User dismissed the A2HS prompt');
      }
      hideInstallPrompt(); // Hide banner after interaction
      // The event can't be used again. The browser usually invalidates it.
      // No need to explicitly setDeferredInstallPromptEvent(null) here as the AppContext state will hide the banner.
    } else {
      // Fallback for browsers that don't support PWA installation or if event is not available
      // This alert is a basic fallback. A more integrated UI element would be better.
      alert(translate('appInstallFallbackAlert') || 'To install this app, use your browser\'s "Add to Home Screen" option in the menu.');
    }
  };

  if (!showInstallPrompt || !deferredInstallPromptEvent) {
    // Do not render if the context says not to show, or if the event isn't actually available
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[999] bg-blue-600 text-white p-4 shadow-lg",
        "transition-transform duration-500 ease-out",
        showInstallPrompt ? "translate-y-0" : "translate-y-full" // Animate slide up/down
      )}
      role="dialog"
      aria-labelledby="install-app-title"
      aria-modal="true"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Download className="h-6 w-6" />
          <div>
            <p id="install-app-title" className="font-medium">{translate('installAppName', { appName: 'AttendEase' })}</p>
            <p className="text-sm text-blue-100">{translate('installAppBenefit')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleInstall}
            className="bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-50"
            aria-label={translate('installButtonLabel')}
          >
            {translate('installButtonText')}
          </Button>
          <Button 
            onClick={hideInstallPrompt} 
            variant="ghost" 
            size="icon" 
            className="p-1 text-white hover:bg-blue-700 rounded"
            aria-label={translate('dismissButtonLabel')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
