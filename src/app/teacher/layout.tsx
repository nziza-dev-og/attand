
import type { ReactNode } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { AppHeader } from '@/components/shared/AppHeader';
import { TeacherSidebar } from './_components/TeacherSidebar';


export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['Teacher']}>
       <div className="flex min-h-screen w-full flex-col bg-muted/40">
         <TeacherSidebar /> {/* Desktop sidebar */}
          <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14"> {/* sm:pl-14 for desktop sidebar */}
            <AppHeader 
              title="Teacher Dashboard" 
              navLinksComponent={<TeacherSidebar isMobileSheet />}
              homePath="/teacher"
            />
             <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
              {children}
            </main>
          </div>
       </div>
    </ProtectedRoute>
  );
}
