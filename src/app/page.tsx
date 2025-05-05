"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth.tsx'; // Updated import path
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        // Redirect based on role
        switch (role) {
          case 'Admin':
            router.push('/admin');
            break;
          case 'Teacher':
            router.push('/teacher');
            break;
          case 'Parent':
            router.push('/parent');
            break;
          default:
            // Handle cases where role is null or unexpected
            console.warn("User logged in but role is unknown or invalid:", role);
             // Maybe redirect to a profile setup page or show an error
             // For now, redirecting to login as a fallback
            router.push('/login');
            break;
        }
      }
    }
  }, [user, role, loading, router]);

  // Display loading indicator while checking auth state
  if (loading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
         <Skeleton className="h-12 w-1/2 rounded-lg" />
         <Skeleton className="h-8 w-1/3 rounded-lg" />
         <Skeleton className="h-64 w-full max-w-md rounded-lg" />
       </div>
     );
  }

  // This content is briefly shown before redirection happens
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Loading...</p>
    </div>
  );
}
