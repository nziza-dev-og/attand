
"use client"; 

import type { ReactNode } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { AppHeader } from '@/components/shared/AppHeader';
import { SuperAdminSidebar } from './_components/SuperAdminSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdvertisementDisplay } from '@/components/shared/AdvertisementDisplay'; // Import Ad Display

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { translate } = useLanguage();
  return (
    <ProtectedRoute allowedRoles={['SuperAdmin']}>
       <div className="flex min-h-screen w-full flex-col bg-muted/40">
         <SuperAdminSidebar />
         <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <AppHeader 
              title={translate('superAdminDashboardTitle') || "Super Admin Dashboard"}
              navLinksComponent={<SuperAdminSidebar isMobileSheet />} 
              homePath="/superadmin" 
            />
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
              <AdvertisementDisplay /> {/* Display Ad */}
              {children}
            </main>
         </div>
       </div>
    </ProtectedRoute>
  );
}
