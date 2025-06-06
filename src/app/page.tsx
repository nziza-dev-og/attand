// src/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth.tsx';
import { LoadingProgressBar } from '@/components/shared/LoadingProgressBar'; // Import the new component
import { useLanguage } from '@/contexts/LanguageContext'; 

export default function Home() {
  const { user, role, loading, isSchoolCodeVerified, isSchoolCodeLocked } = useAuth();
  const router = useRouter();
  const { translate } = useLanguage(); 

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        // Role-based redirection logic (existing)
        if (role === 'Teacher' && (isSchoolCodeVerified === false || isSchoolCodeLocked === true)) {
          router.push('/teacher/verify-school');
        } else {
          switch (role) {
            case 'SuperAdmin':
              router.push('/superadmin');
              break;
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
              router.push('/login'); 
              break;
          }
        }
      }
    }
  }, [user, role, loading, router, isSchoolCodeVerified, isSchoolCodeLocked]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <LoadingProgressBar loadingText={translate('loadingPleaseWait') || "Loading, please wait..."} />
      </div>
    );
  }

  // This part is usually not seen as redirection happens quickly.
  // But keeping a fallback just in case.
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <p>{translate('redirectingText') || "Redirecting..."}</p>
    </div>
  );
}
