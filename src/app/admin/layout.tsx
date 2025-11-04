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
import { Bot } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { translate } = useLanguage();
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);

  const aiCommandButton = (
    <Button variant="outline" size="icon" onClick={() => setIsAiSidebarOpen(true)}>
      <Bot className="h-5 w-5" />
      <span className="sr-only">Open AI Command Center</span>
    </Button>
  );

  return (
    <ProtectedRoute allowedRoles={['Admin']}>
       <div className="flex min-h-screen w-full flex-col bg-muted/40">
         <AdminSidebar />
         <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <AppHeader 
              title={translate('adminDashboardTitle')}
              navLinksComponent={<AdminSidebar isMobileSheet />} 
              homePath="/admin" 
              extraControls={aiCommandButton}
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
       <Sheet open={isAiSidebarOpen} onOpenChange={setIsAiSidebarOpen}>
          <SheetContent className="w-full sm:max-w-md p-0">
             <AiCommandSidebar isSheet={true} onClose={() => setIsAiSidebarOpen(false)} />
          </SheetContent>
       </Sheet>
    </ProtectedRoute>
  );
}
