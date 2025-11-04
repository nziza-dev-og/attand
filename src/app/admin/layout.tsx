// src/app/admin/layout.tsx
"use client";

import { useState, type ReactNode } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { AppHeader } from '@/components/shared/AppHeader';
import { AdminSidebar } from './_components/AdminSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdvertisementDisplay } from '@/components/shared/AdvertisementDisplay';
import { AnnouncementDisplay } from '@/components/shared/AnnouncementDisplay';
import { IncomingCallManager } from '@/components/shared/IncomingCallManager';
import { AiCommandSidebar } from './_components/AiCommandSidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

// Custom SVG Icon for the AI Bot
const AiBotIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: 'rgb(0, 160, 160)', stopOpacity: 1}} />
        <stop offset="50%" style={{stopColor: 'rgb(0, 128, 128)', stopOpacity: 1}} />
        <stop offset="100%" style={{stopColor: 'rgb(0, 100, 100)', stopOpacity: 1}} />
      </linearGradient>
      
      <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{stopColor: 'rgb(250, 250, 250)', stopOpacity: 0.3}} />
        <stop offset="100%" style={{stopColor: 'rgb(250, 250, 250)', stopOpacity: 0.05}} />
      </linearGradient>
      
      <radialGradient id="neuralGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style={{stopColor: 'rgb(250, 250, 250)', stopOpacity: 1}} />
        <stop offset="50%" style={{stopColor: 'rgb(0, 200, 200)', stopOpacity: 0.6}} />
        <stop offset="100%" style={{stopColor: 'rgb(0, 128, 128)', stopOpacity: 0}} />
      </radialGradient>
      
      <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
        <feOffset dx="0" dy="2" result="offsetblur"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3"/>
        </feComponentTransfer>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      
      <filter id="ambientGlow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
        <feFlood floodColor="rgb(0, 128, 128)" floodOpacity="0.4"/>
        <feComposite in2="blur" operator="in" result="glowColor"/>
        <feMerge>
          <feMergeNode in="glowColor"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <circle cx="100" cy="100" r="70" fill="none" stroke="rgb(0, 128, 128)" strokeWidth="1.5" opacity="0.2">
      <animate attributeName="r" values="70;75;70" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite"/>
    </circle>
    
    <circle cx="100" cy="100" r="60" fill="url(#mainGradient)" filter="url(#softShadow)"/>
    
    <circle cx="100" cy="100" r="60" fill="url(#glassGradient)"/>
    
    <circle cx="100" cy="100" r="52" fill="none" stroke="rgb(0, 200, 200)" strokeWidth="1" opacity="0.3"/>
    
    <path d="M 70 85 Q 65 90 70 95" stroke="rgb(250, 250, 250)" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8"/>
    <path d="M 70 75 Q 60 80 65 88" stroke="rgb(250, 250, 250)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7"/>
    <path d="M 75 105 Q 68 110 72 115" stroke="rgb(250, 250, 250)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7"/>
    
    <path d="M 130 85 Q 135 90 130 95" stroke="rgb(250, 250, 250)" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8"/>
    <path d="M 130 75 Q 140 80 135 88" stroke="rgb(250, 250, 250)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7"/>
    <path d="M 125 105 Q 132 110 128 115" stroke="rgb(250, 250, 250)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7"/>
    
    <circle cx="100" cy="100" r="18" fill="url(#neuralGlow)" filter="url(#glow)">
      <animate attributeName="opacity" values="0.9;1;0.9" dur="2s" repeatCount="indefinite"/>
    </circle>
    
    <text x="100" y="107" fontFamily="Arial, sans-serif" fontSize="20" fontWeight="bold" fill="rgb(0, 100, 100)" textAnchor="middle" opacity="0.9">AI</text>
    
    <circle cx="70" cy="85" r="4" fill="rgb(250, 250, 250)" filter="url(#glow)">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="130" cy="85" r="4" fill="rgb(250, 250, 250)" filter="url(#glow)">
      <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="75" cy="105" r="3.5" fill="rgb(250, 250, 250)" filter="url(#glow)">
      <animate attributeName="opacity" values="0.7;1;0.7" dur="1.8s" repeatCount="indefinite" begin="0.3s"/>
    </circle>
    <circle cx="125" cy="105" r="3.5" fill="rgb(250, 250, 250)" filter="url(#glow)">
      <animate attributeName="opacity" values="1;0.7;1" dur="1.8s" repeatCount="indefinite" begin="0.3s"/>
    </circle>
    
    <circle cx="85" cy="70" r="2" fill="rgb(250, 250, 250)" opacity="0">
      <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/>
      <animateTransform attributeName="transform" type="translate" values="0,0; 30,-5; 0,0" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="115" cy="70" r="2" fill="rgb(250, 250, 250)" opacity="0">
      <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0.7s"/>
      <animateTransform attributeName="transform" type="translate" values="0,0; -30,-5; 0,0" dur="2s" repeatCount="indefinite" begin="0.7s"/>
    </circle>
    
    <path d="M 45 55 L 45 45 L 55 45" stroke="rgb(0, 200, 200)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4"/>
    <path d="M 155 55 L 155 45 L 145 45" stroke="rgb(0, 200, 200)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4"/>
    <path d="M 45 145 L 45 155 L 55 155" stroke="rgb(0, 200, 200)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4"/>
    <path d="M 155 145 L 155 155 L 145 155" stroke="rgb(0, 200, 200)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4"/>
    
    <line x1="50" y1="100" x2="150" y2="100" stroke="rgb(0, 200, 200)" strokeWidth="1.5" opacity="0" strokeLinecap="round">
      <animate attributeName="opacity" values="0;0.6;0" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="y1" values="80;120;80" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="y2" values="80;120;80" dur="3s" repeatCount="indefinite"/>
    </line>
    
    <circle cx="90" cy="65" r="1.5" fill="rgb(250, 250, 250)">
      <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" begin="0.2s"/>
    </circle>
    <circle cx="110" cy="135" r="1.5" fill="rgb(250, 250, 250)">
      <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" begin="1s"/>
    </circle>
    <circle cx="65" cy="120" r="1.5" fill="rgb(250, 250, 250)">
      <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" begin="1.5s"/>
    </circle>
    <circle cx="135" cy="70" r="1.5" fill="rgb(250, 250, 250)">
      <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" begin="0.8s"/>
    </circle>
  </svg>
);


export default function AdminLayout({ children }: { children: ReactNode }) {
  const { translate } = useLanguage();
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);

  return (
    <ProtectedRoute allowedRoles={['Admin']}>
       <div className="flex min-h-screen w-full flex-col bg-muted/40">
         <AdminSidebar />
         <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <AppHeader 
              title={translate('adminDashboardTitle')}
              navLinksComponent={<AdminSidebar isMobileSheet />} 
              homePath="/admin" 
            />
            <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0">
              <div className="grid auto-rows-max items-start gap-4">
                <div className="space-y-4">
                  <AdvertisementDisplay />
                  <AnnouncementDisplay /> 
                </div>
                {children}
              </div>
            </main>
         </div>
       </div>
       <IncomingCallManager />

       {/* Floating Action Button */}
       <Button
          onClick={() => setIsAiSidebarOpen(true)}
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-40 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center p-0 overflow-hidden"
          aria-label="Open AI Command Center"
        >
          <AiBotIcon className="h-40 w-40" />
        </Button>
       
       {/* AI Command Center Sheet */}
       <Sheet open={isAiSidebarOpen} onOpenChange={setIsAiSidebarOpen}>
          <SheetContent className="w-full sm:max-w-md p-0" side="right">
             <AiCommandSidebar isSheet={true} onClose={() => setIsAiSidebarOpen(false)} />
          </SheetContent>
       </Sheet>
    </ProtectedRoute>
  );
}
