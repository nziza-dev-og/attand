
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth.tsx';
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { user, role, loading, isSchoolCodeVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        if (role === 'Teacher' && isSchoolCodeVerified === false) {
          router.push('/teacher/verify-school');
        } else {
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
              console.warn("User logged in but role is unknown, invalid, or verification pending:", role);
              router.push('/login'); // Fallback to login if role is strange or not yet determined
              break;
          }
        }
      }
    }
  }, [user, role, loading, router, isSchoolCodeVerified]);

  if (loading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
         <Skeleton className="h-12 w-1/2 rounded-lg" />
         <Skeleton className="h-8 w-1/3 rounded-lg" />
         <Skeleton className="h-64 w-full max-w-md rounded-lg" />
       </div>
     );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Loading...</p>
    </div>
  );
}
