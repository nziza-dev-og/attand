
"use client"; // Required because AppHeader and ParentSidebar use client hooks

import type { ReactNode } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { AppHeader } from '@/components/shared/AppHeader';
import { ParentSidebar } from './_components/ParentSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdvertisementDisplay } from '@/components/shared/AdvertisementDisplay'; // Import Ad Display
import { IncomingCallManager } from '@/components/shared/IncomingCallManager';

export default function ParentLayout({ children }: { children: ReactNode }) {
  const { translate } = useLanguage();
  return (
    <ProtectedRoute allowedRoles={['Parent']}>
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
         <ParentSidebar />
          <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <AppHeader 
              title={translate('parentDashboardTitle')}
              navLinksComponent={<ParentSidebar isMobileSheet />}
              homePath="/parent"
            />
             <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
              <AdvertisementDisplay /> {/* Display Ad */}
              {children}
            </main>
          </div>
       </div>
       <IncomingCallManager />
    </ProtectedRoute>
  );
}
