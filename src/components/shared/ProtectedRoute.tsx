
"use client";

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth.tsx'; // Updated import path
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: Array<'Admin' | 'Teacher' | 'Parent' | 'SuperAdmin'>;
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in, redirect to login
        router.push('/login');
      } else if (!role || !allowedRoles.includes(role)) {
        // Logged in, but role not allowed for this route
        console.warn(`Access denied for role: ${role}. Allowed: ${allowedRoles.join(', ')}`);
         // Redirect to a relevant page or show an unauthorized message
         // Redirecting to home which will handle role-based redirection
        router.push('/');
      }
      // If user is logged in and role is allowed, do nothing (render children)
    }
  }, [user, role, loading, router, allowedRoles]);

  if (loading || !user || (user && role && !allowedRoles.includes(role))) {
    // Show loading state or a placeholder while checking auth/role or redirecting
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 p-4">
        <Skeleton className="h-14 w-full rounded-lg" />
        <div className="flex flex-grow w-full space-x-4">
            <Skeleton className="hidden md:block w-64 rounded-lg" />
             <Skeleton className="flex-grow rounded-lg" />
        </div>
      </div>
    );
  }

  // User is authenticated and has the correct role
  return <>{children}</>;
}
