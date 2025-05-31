// src/app/not-found.tsx
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  const { translate } = useLanguage();
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown === 0) {
      router.push('/');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 text-white p-4 relative overflow-hidden">
      {/* Abstract background elements (simplified) */}
      <div className="absolute inset-0 z-0 opacity-10">
        <img 
          src="https://placehold.co/1920x1080/000000/FFFFFF.png?text=Abstract+Background" 
          alt="Abstract background" 
          className="w-full h-full object-cover"
          data-ai-hint="abstract dark"
        />
      </div>
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <AlertTriangle className="w-24 h-24 text-primary mb-8 animate-pulse" />
        
        <h1 className="text-6xl md:text-8xl font-bold mb-4 tracking-tight">
          {translate('notFoundTitle') || 'Page not found'}
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-md">
          {translate('notFoundDescription') || "The page you're searching for isn't available."}
        </p>
        
        <Button asChild variant="secondary" size="lg" className="bg-slate-700 hover:bg-slate-600 text-white text-lg px-8 py-6 rounded-lg shadow-lg transition-transform hover:scale-105">
          <Link href="/">
            <Home className="mr-2 h-5 w-5" />
            {translate('notFoundGoHomeButton', { countdown: countdown.toString() }) || `Go home in ${countdown}`}
          </Link>
        </Button>
      </div>

      {/* Decorative dots (optional) */}
      <div className="absolute top-10 left-10 w-1 h-1 bg-slate-500 rounded-full animate-ping delay-100"></div>
      <div className="absolute bottom-10 right-10 w-2 h-2 bg-slate-600 rounded-full animate-ping delay-300"></div>
      <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-500"></div>
       <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-slate-700 rounded-full animate-ping delay-700"></div>
    </div>
  );
}
