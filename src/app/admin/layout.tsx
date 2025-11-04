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
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
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
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-40 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center"
          aria-label="Open AI Command Center"
        >
          <AiBotIcon className="h-8 w-8" />
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
