
// src/app/login/page.tsx
"use client";

import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { setDoc, doc, Timestamp, query, collection, where, getDocs } from 'firebase/firestore';
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

const ADMIN_SECRET_CODE = process.env.NEXT_PUBLIC_ADMIN_SECRET_CODE || "attandance";
const SUPER_ADMIN_SECRET_CODE = process.env.NEXT_PUBLIC_SUPER_ADMIN_SECRET_CODE || "superattandance";
const MAX_VERIFICATION_ATTEMPTS = 3;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [name, setName] = useState('');
  const [adminSecretCode, setAdminSecretCode] = useState('');
  const [superAdminSecretCode, setSuperAdminSecretCode] = useState('');
  const [teacherSchoolCode, setTeacherSchoolCode] = useState('');
  const [parentSchoolCode, setParentSchoolCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('login');
  const router = useRouter();
  const { toast } = useToast();
  const { translate } = useLanguage();

  const resetFormFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('');
    setName('');
    setAdminSecretCode('');
    setSuperAdminSecretCode('');
    setTeacherSchoolCode('');
    setParentSchoolCode('');
    setError(null);
  };

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    resetFormFields();
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: translate("loginSuccessTitle") || "Login Successful", description: translate("loginSuccessDesc") || "Redirecting to dashboard..." });
      router.push('/'); 
    } catch (err: any) {
      setError(err.message);
       toast({ variant: "destructive", title: translate("loginFailedTitle") || "Login Failed", description: err.message });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(translate("passwordsDontMatchError"));
      toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("passwordsDontMatchError") });
      return;
    }
    if (!role || role === 'none') {
        setError(translate("selectRoleError"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("selectRoleError") });
        return;
    }
     if (!name.trim()) {
         setError(translate("enterNameError"));
         toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("enterNameError") });
         return;
     }

    if (role === 'Admin') {
      if (adminSecretCode !== ADMIN_SECRET_CODE) {
        setError(translate("invalidAdminCodeError"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("invalidAdminCodeError") });
        return;
      }
    }
    
    if (role === 'SuperAdmin') {
      if (superAdminSecretCode !== SUPER_ADMIN_SECRET_CODE) {
        setError(translate("invalidSuperAdminCodeError"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("invalidSuperAdminCodeError") });
        return;
      }
    }

    if (role === 'Teacher' && !teacherSchoolCode.trim()) {
        setError(translate("enterSchoolCodeErrorTeacher"));
        toast({ variant: "destructive", title: translate("signUpFailedTitle"), description: translate("enterSchoolCodeErrorTeacher") });
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
        isSchoolCodeVerified: role === 'Admin' || role === 'SuperAdmin', 
      };
      
      if (role === 'Admin') {
        userDocData.schoolId = user.uid; 
        userDocData.schoolIdentifierCode = ""; 
      } else if (role === 'SuperAdmin') {
        userDocData.schoolId = null; // SuperAdmins don't belong to a specific school
      } else if (role === 'Teacher') {
        userDocData.enteredSchoolCode = teacherSchoolCode.trim();
        userDocData.assignedClassIds = [];
        userDocData.isSchoolCodeVerified = false;
        userDocData.schoolCodeVerificationAttempts = MAX_VERIFICATION_ATTEMPTS;
        userDocData.isSchoolCodeLocked = false;
        // schoolId for Teacher will be set upon successful verification
      } else if (role === 'Parent') {
        userDocData.childIds = [];
        if (parentSchoolCode.trim()) {
          userDocData.enteredSchoolCode = parentSchoolCode.trim();
          // Attempt to auto-verify and set schoolId if code is valid
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
    }
  };

  return (
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
                 {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">{translate("loginButton")}</Button>
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
                      value={adminSecretCode}
                      onChange={(e) => setAdminSecretCode(e.target.value)}
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
                 {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">{translate("signUpButton")}</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
