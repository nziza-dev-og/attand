
// src/app/teacher/verify-school/page.tsx
"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import { AppHeader } from '@/components/shared/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';

export default function VerifySchoolPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { translate } = useLanguage();

  const [schoolCode, setSchoolCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{translate('loadingPleaseWait') || "Loading, please wait..."}</p>
      </div>
    );
  }

  if (!user || user.isAnonymous) { // Redirect if not logged in or somehow anonymous
      router.push('/login');
      return null;
  }


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolCode.trim()) {
      setError(translate('schoolCodeRequiredError') || "School code is required.");
      toast({ variant: "destructive", title: translate('validationErrorTitle') || "Validation Error", description: translate('schoolCodeRequiredError') || "School code is required."});
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

      if (adminSnap.empty) {
        setError(translate('invalidSchoolCodeError') || "Invalid school code. Please check the code and try again, or contact your administrator.");
        toast({ variant: "destructive", title: translate('verificationFailedTitle') || "Verification Failed", description: translate('invalidSchoolCodeError') || "Invalid school code." });
        setIsLoading(false);
        return;
      }

      // Assuming only one admin will have this unique code, or take the first one.
      // const adminData = adminSnap.docs[0].data();

      // Update teacher's profile
      const teacherDocRef = doc(db, "users", user.uid);
      await updateDoc(teacherDocRef, {
        enteredSchoolCode: schoolCode.trim(),
        isSchoolCodeVerified: true,
      });

      toast({ title: translate('schoolCodeVerifiedTitle') || "School Code Verified", description: translate('redirectingToDashboardDesc') || "Redirecting to your dashboard..." });
      router.push('/teacher'); // Redirect to teacher dashboard

    } catch (err: any) {
      console.error("Error verifying school code:", err);
      setError(translate('verificationProcessError') || "An error occurred during verification. Please try again.");
      toast({ variant: "destructive", title: translate('errorTitle') || "Error", description: translate('verificationProcessError') || "An error occurred during verification." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <AppHeader 
        title={translate('verifySchoolCodeTitle') || "Verify School Code"} 
        homePath="/login" // Or a neutral path if preferred
      />
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-6 w-6" />
              {translate('verifySchoolCodeTitle') || "Verify Your School"}
            </CardTitle>
            <CardDescription>{translate('verifySchoolCodeDesc') || "Please enter the School Identifier Code provided by your administrator to access your school's dashboard."}</CardDescription>
          </CardHeader>
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
                  disabled={isLoading}
                />
              </div>
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {translate('verifyAndProceedButton') || "Verify and Proceed"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
