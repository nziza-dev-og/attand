
// src/app/login/page.tsx
"use client";

import { useState, type FormEvent, useEffect, useRef } from 'react';
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

const SUPER_ADMIN_SECRET_CODE = process.env.NEXT_PUBLIC_SUPER_ADMIN_SECRET_CODE || "superattandance";
const MAX_VERIFICATION_ATTEMPTS = 3;

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFormFields = () => {
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
  };

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    resetFormFields();
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: translate("loginSuccessTitle"), description: translate("loginSuccessDesc") });
      router.push('/');
    } catch (err: any) {
      setError(err.message);
      toast({ variant: "destructive", title: translate("loginFailedTitle"), description: err.message });
      resetFormFields();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      setError(translate("passwordsDontMatchError"));
      toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("passwordsDontMatchError") });
      setIsSubmitting(false);
      return;
    }
    if (!role || role === 'none') {
        setError(translate("selectRoleError"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("selectRoleError") });
        setIsSubmitting(false);
        return;
    }
     if (!name.trim()) {
         setError(translate("enterNameError"));
         toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("enterNameError") });
         setIsSubmitting(false);
         return;
     }

    if (role === 'Admin') {
      try {
        const regCodesDocRef = doc(db, "platformSettings", "registrationCodes");
        const docSnap = await getDoc(regCodesDocRef);
        if (!docSnap.exists() || !docSnap.data()?.adminSecretCode) {
          setError(translate("adminRegCodeNotSetError"));
          toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("adminRegCodeNotSetError") });
          setIsSubmitting(false);
          return;
        }
        const firestoreAdminCode = docSnap.data().adminSecretCode;
        if (adminSecretCodeInput !== firestoreAdminCode) {
          setError(translate("invalidAdminCodeError"));
          toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("invalidAdminCodeError") });
          setIsSubmitting(false);
          return;
        }
      } catch (fetchError) {
        console.error("Error fetching admin registration code during signup:", fetchError);
        setError(translate("errorFetchingAdminCode"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("errorFetchingAdminCode") });
        setIsSubmitting(false);
        return;
      }
    }

    if (role === 'SuperAdmin') {
      if (superAdminSecretCode !== SUPER_ADMIN_SECRET_CODE) {
        setError(translate("invalidSuperAdminCodeError"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("invalidSuperAdminCodeError") });
        setIsSubmitting(false);
        return;
      }
    }

    if (role === 'Teacher' && !teacherSchoolCode.trim()) {
        setError(translate("enterSchoolCodeErrorTeacher"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("enterSchoolCodeErrorTeacher") });
        setIsSubmitting(false);
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
        isSchoolCodeVerified: role === 'SuperAdmin', // SuperAdmins are auto-verified
        schoolId: null, // Default to null, set below for Admin
      };

      if (role === 'Admin') {
        userDocData.schoolId = user.uid; // Admin's own UID is their schoolId
        userDocData.schoolIdentifierCode = ""; // Initialize school code
        userDocData.isSchoolCodeVerified = true; // Admins are auto-verified for their own school
      } else if (role === 'Teacher') {
        userDocData.enteredSchoolCode = teacherSchoolCode.trim();
        userDocData.assignedClassIds = [];
        userDocData.isSchoolCodeVerified = false; // Teachers need to verify
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
            userDocData.schoolId = adminSnap.docs[0].id; // Associate with Admin's schoolId
            userDocData.isSchoolCodeVerified = true; // Auto-verify if code matches
            toast({ title: translate('schoolCodeVerifiedTitle'), description: translate('parentSchoolCodeVerifiedDesc') });
          } else {
            userDocData.isSchoolCodeVerified = false;
            toast({ variant: "warning", title: translate('schoolCodeNotFoundTitle'), description: translate('parentSchoolCodeNotFoundDesc') });
          }
        } else {
            userDocData.isSchoolCodeVerified = false; // No code entered, not verified
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
      resetFormFields();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
                    />
                  </div>
                   {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                    {isSubmitting ? (translate('loading') || 'Loading...') : translate("loginButton")}
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
                         disabled={isSubmitting}
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
                       disabled={isSubmitting}
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="role">{translate("roleLabel")}</Label>
                     <Select value={role || 'none'} onValueChange={(value) => setRole(value === 'none' ? '' : value as Role)} disabled={isSubmitting}>
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                       disabled={isSubmitting}
                    />
                  </div>
                   {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                     {isSubmitting ? (translate('loading') || 'Loading...') : translate("signUpButton")}
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
