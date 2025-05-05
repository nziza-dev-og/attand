import type { ReactNode } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { AppHeader } from '@/components/shared/AppHeader';
import { ParentSidebar } from './_components/ParentSidebar';

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['Parent']}>
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
         <ParentSidebar />
          <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <AppHeader title="Parent Dashboard" />
             <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
              {children}
            </main>
          </div>
       </div>
    </ProtectedRoute>
  );
}
