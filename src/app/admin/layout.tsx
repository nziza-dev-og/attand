// src/app/admin/layout.tsx
"use client";

import type { ReactNode } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { AppHeader } from '@/components/shared/AppHeader';
import { AdminSidebar } from './_components/AdminSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdvertisementDisplay } from '@/components/shared/AdvertisementDisplay';
import { AnnouncementDisplay } from '@/components/shared/AnnouncementDisplay';
import { IncomingCallManager } from '@/components/shared/IncomingCallManager';
import { AiCommandSidebar } from './_components/AiCommandSidebar'; // Import the new AI sidebar

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { translate } = useLanguage();
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
            <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:grid-cols-3 lg:grid-cols-4">
              <div className="grid auto-rows-max items-start gap-4 md:col-span-2 lg:col-span-3">
                <div className="space-y-4"> {/* Wrapper for ads and announcements */}
                  <AdvertisementDisplay />
                  <AnnouncementDisplay /> 
                </div>
                {children}
              </div>
              <div className="hidden md:block md:col-span-1 lg:col-span-1">
                 <AiCommandSidebar />
              </div>
            </main>
         </div>
       </div>
       <IncomingCallManager />
    </ProtectedRoute>
  );
}