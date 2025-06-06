
// src/app/login/page.tsx
"use client";

import { useState, type FormEvent, useEffect, useRef, useCallback } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { setDoc, doc, Timestamp, query, collection, where, getDocs, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import type { Role } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import Script from 'next/script';

// This type assertion is necessary if you're using Turnstile's explicit rendering
declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, params: TurnstileRenderParameters) => string | undefined;
      reset: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileRenderParameters {
  sitekey: string;
  action?: string;
  cData?: string;
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  language?: string | 'auto';
  tabindex?: number;
  'response-field'?: boolean;
  'response-field-name'?: string;
  size?: 'normal' | 'compact';
  retry?: 'auto' | 'never';
  'retry-interval'?: number;
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  // ... any other parameters specific to Turnstile
}


const SUPER_ADMIN_SECRET_CODE = process.env.NEXT_PUBLIC_SUPER_ADMIN_SECRET_CODE || "superattandance";
const MAX_VERIFICATION_ATTEMPTS = 3;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "cAnufKypsdnp4e7PSQp4qCIVJ9V9ya5FUJaSKVTB";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [name, setName] = useState('');
  const [adminSecretCodeInput, setAdminSecretCodeInput] = useState('');
  const [superAdminSecretCode, setSuperAdminSecretCode] = useState('');
  const [teacherSchoolCode, setTeacherSchoolCode] = useState('');
  const [parentSchoolCode, setParentSchoolCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('login');
  const router = useRouter();
  const { toast } = useToast();
  const { translate } = useLanguage();

  const [isTurnstileReady, setIsTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileLoginWidgetRef = useRef<HTMLDivElement>(null);
  const turnstileSignupWidgetRef = useRef<HTMLDivElement>(null);
  const [loginWidgetId, setLoginWidgetId] = useState<string | undefined>(undefined);
  const [signupWidgetId, setSignupWidgetId] = useState<string | undefined>(undefined);


  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      console.error("Cloudflare Turnstile Site Key is not configured. Please set NEXT_PUBLIC_TURNSTILE_SITE_KEY environment variable.");
    }
  }, []);

  const renderTurnstileWidget = useCallback((widgetRef: React.RefObject<HTMLDivElement>, tab: 'login' | 'signup', setWidgetId: React.Dispatch<React.SetStateAction<string | undefined>>) => {
    if (widgetRef.current && window.turnstile && TURNSTILE_SITE_KEY && isTurnstileReady) {
      widgetRef.current.innerHTML = ''; // Clear previous widget if any
      try {
        const widgetId = window.turnstile.render(widgetRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: function(token: string) {
            console.log(`Turnstile token for ${tab}: ${token}`);
            setTurnstileToken(token);
          },
          'expired-callback': function() {
            console.log(`Turnstile token for ${tab} expired.`);
            setTurnstileToken(null);
            // Re-render the specific widget
            if (widgetRef.current) {
                 renderTurnstileWidget(widgetRef, tab, setWidgetId);
            }
          },
          'error-callback': function() {
            console.error(`Turnstile error for ${tab}.`);
            setError(translate('turnstileError'));
            setTurnstileToken(null);
          }
        });
        setWidgetId(widgetId);
      } catch (e) {
        console.error(`Error rendering Turnstile widget for ${tab}:`, e);
        setError(translate('turnstileError'));
      }
    }
  }, [isTurnstileReady, translate]);
  
  useEffect(() => {
    if (isTurnstileReady) {
      if (currentTab === 'login' && turnstileLoginWidgetRef.current) {
        if (loginWidgetId && window.turnstile) window.turnstile.remove(loginWidgetId); // Remove old if exists
        renderTurnstileWidget(turnstileLoginWidgetRef, 'login', setLoginWidgetId);
      } else if (currentTab === 'signup' && turnstileSignupWidgetRef.current) {
        if (signupWidgetId && window.turnstile) window.turnstile.remove(signupWidgetId); // Remove old if exists
        renderTurnstileWidget(turnstileSignupWidgetRef, 'signup', setSignupWidgetId);
      }
    }
  }, [isTurnstileReady, currentTab, renderTurnstileWidget, loginWidgetId, signupWidgetId]);


  const resetFormFields = (resetToken: boolean = true) => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('');
    setName('');
    setAdminSecretCodeInput('');
    setSuperAdminSecretCode('');
    setTeacherSchoolCode('');
    setParentSchoolCode('');
    setError(null);
    if (resetToken) {
      setTurnstileToken(null);
      // Re-render the current widget to reset its state
      if(isTurnstileReady && window.turnstile) {
        if (currentTab === 'login' && turnstileLoginWidgetRef.current) {
            if (loginWidgetId) window.turnstile.remove(loginWidgetId);
            renderTurnstileWidget(turnstileLoginWidgetRef, 'login', setLoginWidgetId);
        } else if (currentTab === 'signup' && turnstileSignupWidgetRef.current) {
            if (signupWidgetId) window.turnstile.remove(signupWidgetId);
            renderTurnstileWidget(turnstileSignupWidgetRef, 'signup', setSignupWidgetId);
        }
      }
    }
  };

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    resetFormFields(); 
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!TURNSTILE_SITE_KEY) {
      setError(translate('turnstileNotConfiguredError'));
      toast({ variant: "destructive", title: translate("loginFailedTitle"), description: translate('turnstileNotConfiguredError') });
      return;
    }
    if (!turnstileToken) {
      setError(translate('humanVerificationRequiredError'));
      toast({ variant: "destructive", title: translate("loginFailedTitle"), description: translate('humanVerificationRequiredError') });
      return;
    }
    
    // TODO: Send turnstileToken to your backend for verification with your Turnstile Secret Key
    // Example: const verificationResult = await verifyTurnstileOnBackend(turnstileToken);
    // if (!verificationResult.success) {
    //   setError("Turnstile verification failed on server.");
    //   toast({ variant: "destructive", title: "Login Failed", description: "Human verification failed." });
    //   resetFormFields(true);
    //   return;
    // }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: translate("loginSuccessTitle"), description: translate("loginSuccessDesc") });
      router.push('/');
    } catch (err: any) {
      setError(err.message);
      toast({ variant: "destructive", title: translate("loginFailedTitle"), description: err.message });
      resetFormFields(true); 
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!TURNSTILE_SITE_KEY) {
        setError(translate('turnstileNotConfiguredError'));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate('turnstileNotConfiguredError') });
        return;
    }
    if (!turnstileToken) {
      setError(translate('humanVerificationRequiredError'));
      toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate('humanVerificationRequiredError') });
      return;
    }

    // TODO: Send turnstileToken to your backend for verification (similar to login)

    if (password !== confirmPassword) {
      setError(translate("passwordsDontMatchError"));
      toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("passwordsDontMatchError") });
      resetFormFields(true);
      return;
    }
    if (!role || role === 'none') {
        setError(translate("selectRoleError"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("selectRoleError") });
        resetFormFields(true);
        return;
    }
     if (!name.trim()) {
         setError(translate("enterNameError"));
         toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("enterNameError") });
         resetFormFields(true);
         return;
     }

    if (role === 'Admin') {
      try {
        const regCodesDocRef = doc(db, "platformSettings", "registrationCodes");
        const docSnap = await getDoc(regCodesDocRef);
        if (!docSnap.exists() || !docSnap.data()?.adminSecretCode) {
          setError(translate("adminRegCodeNotSetError"));
          toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("adminRegCodeNotSetError") });
          resetFormFields(true);
          return;
        }
        const firestoreAdminCode = docSnap.data().adminSecretCode;
        if (adminSecretCodeInput !== firestoreAdminCode) {
          setError(translate("invalidAdminCodeError"));
          toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("invalidAdminCodeError") });
          resetFormFields(true);
          return;
        }
      } catch (fetchError) {
        console.error("Error fetching admin registration code during signup:", fetchError);
        setError(translate("errorFetchingAdminCode"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("errorFetchingAdminCode") });
        resetFormFields(true);
        return;
      }
    }

    if (role === 'SuperAdmin') {
      if (superAdminSecretCode !== SUPER_ADMIN_SECRET_CODE) {
        setError(translate("invalidSuperAdminCodeError"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("invalidSuperAdminCodeError") });
        resetFormFields(true);
        return;
      }
    }

    if (role === 'Teacher' && !teacherSchoolCode.trim()) {
        setError(translate("enterSchoolCodeErrorTeacher"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("enterSchoolCodeErrorTeacher") });
        resetFormFields(true);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name.trim() });

      const userDocData: any = {
        email: user.email,
        role: role,
        uid: user.uid,
        name: name.trim(),
        createdAt: Timestamp.now(),
        isSchoolCodeVerified: role === 'SuperAdmin',
        schoolId: null,
      };

      if (role === 'Admin') {
        userDocData.schoolId = user.uid; 
        userDocData.schoolIdentifierCode = ""; 
        userDocData.isSchoolCodeVerified = true; 
      } else if (role === 'Teacher') {
        userDocData.enteredSchoolCode = teacherSchoolCode.trim();
        userDocData.assignedClassIds = [];
        userDocData.isSchoolCodeVerified = false; 
        userDocData.schoolCodeVerificationAttempts = MAX_VERIFICATION_ATTEMPTS;
        userDocData.isSchoolCodeLocked = false;
      } else if (role === 'Parent') {
        userDocData.childIds = [];
        if (parentSchoolCode.trim()) {
          userDocData.enteredSchoolCode = parentSchoolCode.trim();
          const adminsQuery = query(
            collection(db, "users"),
            where("role", "==", "Admin"),
            where("schoolIdentifierCode", "==", parentSchoolCode.trim())
          );
          const adminSnap = await getDocs(adminsQuery);
          if (!adminSnap.empty) {
            userDocData.schoolId = adminSnap.docs[0].id; 
            userDocData.isSchoolCodeVerified = true; 
            toast({ title: translate('schoolCodeVerifiedTitle'), description: translate('parentSchoolCodeVerifiedDesc') });
          } else {
            userDocData.isSchoolCodeVerified = false;
            toast({ variant: "warning", title: translate('schoolCodeNotFoundTitle'), description: translate('parentSchoolCodeNotFoundDesc') });
          }
        } else {
            userDocData.isSchoolCodeVerified = false;
        }
      }

      await setDoc(doc(db, 'users', user.uid), userDocData);

      toast({ title: translate("signUpSuccessTitle"), description: translate("signUpSuccessDesc") });
      resetFormFields();
      setCurrentTab('login');

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError(translate("emailInUseError"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("emailInUseError") });
      } else if (err.code === 'auth/weak-password') {
         setError(translate("weakPasswordError"));
         toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("weakPasswordError") });
      }
      else {
        setError(err.message);
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: err.message });
      }
      resetFormFields(true); 
    }
  };

  return (
    <>
      {TURNSTILE_SITE_KEY && (
        <Script
          id="cf-turnstile-script"
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
          onLoad={() => {
            console.log("Cloudflare Turnstile script loaded.");
            setIsTurnstileReady(true);
          }}
          onError={(e) => {
            console.error("Failed to load Cloudflare Turnstile script:", e);
            setError(translate('turnstileLoadError'));
            toast({ variant: "destructive", title: "Error", description: translate('turnstileLoadError') });
          }}
        />
      )}
      <div className="flex items-center justify-center min-h-screen bg-secondary">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{translate("loginTab")}</TabsTrigger>
            <TabsTrigger value="signup">{translate("signUpTab")}</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>{translate("loginTitle")}</CardTitle>
                <CardDescription>{translate("loginDescription")}</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  {!TURNSTILE_SITE_KEY && (
                    <p className="text-sm font-medium text-destructive p-2 border border-destructive/50 bg-destructive/10 rounded-md">
                        {translate('turnstileNotConfiguredError')}
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{translate("emailLabel")}</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{translate("passwordLabel")}</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  {TURNSTILE_SITE_KEY && (
                    <div ref={turnstileLoginWidgetRef} className="cf-turnstile-container my-4 min-h-[65px]">
                      {/* Turnstile widget will render here */}
                    </div>
                  )}
                   {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!TURNSTILE_SITE_KEY || !isTurnstileReady || (!turnstileToken && !!TURNSTILE_SITE_KEY)}>
                    {translate("loginButton")}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>{translate("signUpTitle")}</CardTitle>
                <CardDescription>{translate("signUpDescription")}</CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  {!TURNSTILE_SITE_KEY && (
                    <p className="text-sm font-medium text-destructive p-2 border border-destructive/50 bg-destructive/10 rounded-md">
                       {translate('turnstileNotConfiguredError')}
                    </p>
                  )}
                   <div className="space-y-2">
                      <Label htmlFor="signup-name">{translate("nameLabel")}</Label>
                      <Input
                         id="signup-name"
                         type="text"
                         placeholder={translate("fullNamePlaceholder")}
                         value={name}
                         onChange={(e) => setName(e.target.value)}
                         required
                         autoComplete="name"
                      />
                   </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{translate("emailLabel")}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                       autoComplete="email"
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="role">{translate("roleLabel")}</Label>
                     <Select value={role || 'none'} onValueChange={(value) => setRole(value === 'none' ? '' : value as Role)}>
                        <SelectTrigger id="role">
                          <SelectValue placeholder={translate("selectRolePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="none" disabled>{translate("selectRolePlaceholder")}</SelectItem>
                           <SelectItem value="SuperAdmin">{translate("roleSuperAdmin")}</SelectItem>
                          <SelectItem value="Admin">{translate("roleAdmin")}</SelectItem>
                          <SelectItem value="Teacher">{translate("roleTeacher")}</SelectItem>
                          <SelectItem value="Parent">{translate("roleParent")}</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                  {role === 'Admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="admin-secret-code">{translate("adminSecretCodeLabel")}</Label>
                      <Input
                        id="admin-secret-code"
                        type="password"
                        placeholder={translate("enterAdminSecretCodePlaceholder")}
                        value={adminSecretCodeInput}
                        onChange={(e) => setAdminSecretCodeInput(e.target.value)}
                        required
                        autoComplete="off"
                      />
                    </div>
                  )}
                  {role === 'SuperAdmin' && (
                    <div className="space-y-2">
                      <Label htmlFor="super-admin-secret-code">{translate("superAdminSecretCodeLabel")}</Label>
                      <Input
                        id="super-admin-secret-code"
                        type="password"
                        placeholder={translate("enterSuperAdminSecretCodePlaceholder")}
                        value={superAdminSecretCode}
                        onChange={(e) => setSuperAdminSecretCode(e.target.value)}
                        required
                        autoComplete="off"
                      />
                    </div>
                  )}
                  {role === 'Teacher' && (
                    <div className="space-y-2">
                      <Label htmlFor="teacher-school-code">{translate("teacherSchoolCodeLabel")}</Label>
                      <Input
                        id="teacher-school-code"
                        type="text"
                        placeholder={translate("enterSchoolCodePlaceholderTeacher")}
                        value={teacherSchoolCode}
                        onChange={(e) => setTeacherSchoolCode(e.target.value)}
                        required
                        autoComplete="off"
                      />
                    </div>
                  )}
                  {role === 'Parent' && (
                    <div className="space-y-2">
                      <Label htmlFor="parent-school-code">{translate("parentSchoolCodeLabel")}</Label>
                      <Input
                        id="parent-school-code"
                        type="text"
                        placeholder={translate("enterSchoolCodePlaceholderParentOptional")}
                        value={parentSchoolCode}
                        onChange={(e) => setParentSchoolCode(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{translate("passwordLabel")}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{translate("confirmPasswordLabel")}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                       autoComplete="new-password"
                    />
                  </div>
                  {TURNSTILE_SITE_KEY && (
                    <div ref={turnstileSignupWidgetRef} className="cf-turnstile-container my-4 min-h-[65px]">
                      {/* Turnstile widget will render here */}
                    </div>
                  )}
                   {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!TURNSTILE_SITE_KEY || !isTurnstileReady || (!turnstileToken && !!TURNSTILE_SITE_KEY)}>
                    {translate("signUpButton")}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

