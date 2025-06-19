
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useState, useContext, useCallback } from 'react';

interface AppContextType {
  showInstallPrompt: boolean;
  hideInstallPrompt: () => void;
  deferredInstallPromptEvent: any | null; // Stores the BeforeInstallPromptEvent
  setDeferredInstallPromptEvent: (event: any | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [showInstallPromptState, setShowInstallPromptState] = useState(false);
  const [deferredInstallPromptEvent, setDeferredInstallPromptEventState] = useState<any | null>(null);

  const handleSetDeferredInstallPromptEvent = useCallback((event: any | null) => {
    setDeferredInstallPromptEventState(event);
    if (event) {
      // Check if app is already running in standalone mode
      if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
        setShowInstallPromptState(false); // Don't show banner if already installed
      } else {
        setShowInstallPromptState(true); // Event is available, eligible to show banner
      }
    } else {
      setShowInstallPromptState(false); // No event, don't show banner
    }
  }, []);

  const hidePrompt = useCallback(() => {
    setShowInstallPromptState(false);
  }, []);

  return (
    <AppContext.Provider value={{ 
        showInstallPrompt: showInstallPromptState, 
        hideInstallPrompt: hidePrompt,
        deferredInstallPromptEvent,
        setDeferredInstallPromptEvent: handleSetDeferredInstallPromptEvent
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
