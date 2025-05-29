
import type { ReactNode } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { AppHeader } from '@/components/shared/AppHeader';
import { AdminSidebar } from './_components/AdminSidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['Admin']}>
       <div className="flex min-h-screen w-full flex-col bg-muted/40">
         <AdminSidebar /> {/* This is the desktop sidebar, hidden on mobile by its own classes */}
         <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14"> {/* sm:pl-14 for desktop sidebar */}
            <AppHeader 
              title="Admin Dashboard" 
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
