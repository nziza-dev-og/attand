// src/components/shared/LoadingProgressBar.tsx
"use client";

import { useEffect, useState } from 'react';

interface LoadingProgressBarProps {
  loadingText?: string;
  duration?: number; // Duration in milliseconds
}

export function LoadingProgressBar({ 
  loadingText = "Loading...",
  duration = 800 // Default duration 800ms
}: LoadingProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress from 0 to 100 over the specified duration
    // This is a visual effect, not tied to actual loading progress.
    const timer = setTimeout(() => setProgress(100), 50); // Start animation almost immediately
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md space-y-3">
      <div className="w-full bg-secondary rounded-md h-5 shadow-inner overflow-hidden border border-primary/20">
        <div
          className="bg-primary h-full rounded-md transition-all ease-out"
          style={{ width: `${progress}%`, transitionDuration: `${duration}ms` }}
        ></div>
      </div>
      {loadingText && <p className="text-md font-medium text-muted-foreground">{loadingText}</p>}
    </div>
  );
}
