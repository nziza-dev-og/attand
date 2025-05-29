
// src/app/teacher/verify-school/page.tsx
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, AlertTriangle } from 'lucide-react';
import { AppHeader } from '@/components/shared/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';

const MAX_VERIFICATION_ATTEMPTS = 3;

export default function VerifySchoolPage() {
  const { user, loading: authLoading, schoolCodeVerificationAttempts, isSchoolCodeLocked, isSchoolCodeVerified } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { translate } = useLanguage();

  const [schoolCode, setSchoolCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(MAX_VERIFICATION_ATTEMPTS);
  const [isAccountLocked, setIsAccountLocked] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (isSchoolCodeVerified) {
        router.push('/teacher'); // Already verified, redirect
        return;
      }
      const currentAttempts = typeof schoolCodeVerificationAttempts === 'number' ? schoolCodeVerificationAttempts : MAX_VERIFICATION_ATTEMPTS;
      setAttemptsLeft(currentAttempts);
      setIsAccountLocked(isSchoolCodeLocked || false);

      if (isSchoolCodeLocked) {
         setError(translate('accountLockedError'));
      }
    }
  }, [user, authLoading, schoolCodeVerificationAttempts, isSchoolCodeLocked, isSchoolCodeVerified, router, translate]);


  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{translate('loadingPleaseWait') || "Loading, please wait..."}</p>
      </div>
    );
  }

  if (!user || user.isAnonymous) { 
      router.push('/login');
      return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolCode.trim()) {
      setError(translate('schoolCodeRequiredError'));
      toast({ variant: "destructive", title: translate('validationErrorTitle'), description: translate('schoolCodeRequiredError')});
      return;
    }
    if (isAccountLocked) {
      setError(translate('accountLockedError'));
      toast({ variant: "destructive", title: translate('accountLockedTitle'), description: translate('accountLockedError')});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const adminsQuery = query(
        collection(db, "users"),
        where("role", "==", "Admin"),
        where("schoolIdentifierCode", "==", schoolCode.trim())
      );
      const adminSnap = await getDocs(adminsQuery);
      const teacherDocRef = doc(db, "users", user.uid);

      if (adminSnap.empty) {
        const newAttemptsLeft = attemptsLeft - 1;
        setAttemptsLeft(newAttemptsLeft);
        await updateDoc(teacherDocRef, {
          schoolCodeVerificationAttempts: newAttemptsLeft
        });

        if (newAttemptsLeft <= 0) {
          await updateDoc(teacherDocRef, {
            isSchoolCodeLocked: true
          });
          setIsAccountLocked(true);
          setError(translate('accountLockedError'));
          toast({ variant: "destructive", title: translate('accountLockedTitle'), description: translate('accountLockedError') });
          // Conceptual: Notify admin about locked account
          // console.log("Backend Task: Notify admin that teacher", user.email, "locked their account trying to verify school code:", schoolCode.trim());
        } else {
          setError(translate('invalidSchoolCodeAttemptsError', { attempts: newAttemptsLeft.toString() }));
          toast({ variant: "destructive", title: translate('verificationFailedTitle'), description: translate('invalidSchoolCodeAttemptsError', { attempts: newAttemptsLeft.toString() }) });
        }
        setIsLoading(false);
        return;
      }

      // Code is correct
      await updateDoc(teacherDocRef, {
        enteredSchoolCode: schoolCode.trim(),
        isSchoolCodeVerified: true,
        isSchoolCodeLocked: false, // Unlock if it was locked
        schoolCodeVerificationAttempts: MAX_VERIFICATION_ATTEMPTS // Reset attempts
      });

      toast({ title: translate('schoolCodeVerifiedTitle'), description: translate('redirectingToDashboardDesc') });
      router.push('/teacher'); 

    } catch (err: any) {
      console.error("Error verifying school code:", err);
      setError(translate('verificationProcessError'));
      toast({ variant: "destructive", title: translate('errorTitle'), description: translate('verificationProcessError')});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <AppHeader 
        title={translate('verifySchoolCodeTitle')}
        homePath="/login" 
      />
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-6 w-6" />
              {translate('verifySchoolCodeTitle')}
            </CardTitle>
            <CardDescription>
              {isAccountLocked 
                ? translate('accountLockedDesc')
                : translate('verifySchoolCodeDesc')
              }
            </CardDescription>
          </CardHeader>
          {!isAccountLocked && (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="school-code">{translate('schoolIdentifierCodeLabel')}</Label>
                  <Input
                    id="school-code"
                    type="text"
                    placeholder={translate('enterSchoolCodePlaceholder')}
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                    required
                    disabled={isLoading || isAccountLocked}
                  />
                </div>
                {error && <p className="text-sm font-medium text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> {error}</p>}
                {!isAccountLocked && attemptsLeft < MAX_VERIFICATION_ATTEMPTS && attemptsLeft > 0 && (
                  <p className="text-sm text-orange-600">{translate('attemptsRemaining', { attempts: attemptsLeft.toString() })}</p>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading || isAccountLocked}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {translate('verifyAndProceedButton')}
                </Button>
              </CardFooter>
            </form>
          )}
          {isAccountLocked && (
             <CardContent>
                <p className="text-destructive font-medium text-center p-4 border border-destructive bg-destructive/10 rounded-md">
                    {translate('accountLockedContactAdmin')}
                </p>
             </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
}
