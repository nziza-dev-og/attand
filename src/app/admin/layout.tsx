
"use client"; // Required because AppHeader and AdminSidebar use client hooks

import type { ReactNode } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { AppHeader } from '@/components/shared/AppHeader';
import { AdminSidebar } from './_components/AdminSidebar';
import { useLanguage } from '@/contexts/LanguageContext';

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
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
              {children}
            </main>
         </div>
       </div>
    </ProtectedRoute>
  );
}
