// src/app/login/page.tsx
"use client";

import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { setDoc, doc, Timestamp } from 'firebase/firestore'; // Import Timestamp
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import type { Role } from '@/lib/types'; // Import Role type

const ADMIN_SECRET_CODE = process.env.NEXT_PUBLIC_ADMIN_SECRET_CODE || "attandance"; // Use environment variable or default

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Use '' for initial state but handle 'none' from Select
  const [role, setRole] = useState<Role | ''>('');
  const [name, setName] = useState(''); // Add state for name
  const [secretCode, setSecretCode] = useState(''); // State for secret code
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('login'); // To reset fields on tab change
  const router = useRouter();
  const { toast } = useToast();

  const resetFormFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('');
    setName(''); // Reset name field
    setSecretCode('');
    setError(null);
  };

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    resetFormFields(); // Clear fields when switching tabs
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login Successful", description: "Redirecting to dashboard..." });
      router.push('/'); // Redirect to dashboard or role-specific page
    } catch (err: any) {
      setError(err.message);
       toast({ variant: "destructive", title: "Login Failed", description: err.message });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      toast({ variant: "destructive", title: "Sign Up Failed", description: "Passwords do not match" });
      return;
    }
     // Check if role is selected (and not the placeholder 'none')
    if (!role || role === 'none') {
        setError("Please select a role");
        toast({ variant: "destructive", title: "Sign Up Failed", description: "Please select a role" });
        return;
    }
     if (!name.trim()) { // Validate name is not empty
         setError("Please enter your name");
         toast({ variant: "destructive", title: "Sign Up Failed", description: "Please enter your name" });
         return;
     }


    // Check for secret code if Admin role is selected
    if (role === 'Admin') {
      if (secretCode !== ADMIN_SECRET_CODE) {
        setError("Invalid secret code for Admin registration.");
        toast({ variant: "destructive", title: "Sign Up Failed", description: "Invalid secret code for Admin registration." });
        return;
      }
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store user role and name in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: role, // This should be 'Admin', 'Teacher', or 'Parent'
        uid: user.uid,
        name: name.trim(), // Save trimmed name
        createdAt: Timestamp.now(), // Use Firestore Timestamp
         // Initialize role-specific fields if applicable
         ...(role === 'Teacher' && { assignedClassIds: [] }),
         ...(role === 'Parent' && { childIds: [] }),
         ...(role === 'Student' && { classIds: [], parentIds: [] }), // Though students aren't signed up here
      });

      toast({ title: "Sign Up Successful", description: "You can now log in." });
      resetFormFields();
      setCurrentTab('login'); // Switch back to login tab after successful signup


    } catch (err: any) {
      // Handle specific Firebase errors if needed
      if (err.code === 'auth/email-already-in-use') {
        setError("This email address is already in use.");
        toast({ variant: "destructive", title: "Sign Up Failed", description: "This email address is already in use." });
      } else if (err.code === 'auth/weak-password') {
         setError("Password should be at least 6 characters.");
         toast({ variant: "destructive", title: "Sign Up Failed", description: "Password should be at least 6 characters." });
      }
      else {
        setError(err.message);
        toast({ variant: "destructive", title: "Sign Up Failed", description: err.message });
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>Enter your credentials to access your account.</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
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
                  <Label htmlFor="login-password">Password</Label>
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
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Login</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>Create a new account.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSignUp}>
              <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="signup-name">Name</Label>
                    <Input
                       id="signup-name"
                       type="text"
                       placeholder="Your Full Name"
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       required
                       autoComplete="name"
                    />
                 </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
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
                  <Label htmlFor="role">Role</Label>
                   {/* Pass role or 'none' if role is empty */}
                   <Select value={role || 'none'} onValueChange={(value) => setRole(value === 'none' ? '' : value as Role)}>
                      <SelectTrigger id="role">
                        {/* Placeholder updated */}
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                         {/* Add a disabled item with value 'none' for the placeholder */}
                         <SelectItem value="none" disabled>Select your role</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Teacher">Teacher</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                 {/* Conditionally render secret code input for Admin */}
                {role === 'Admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="secret-code">Admin Secret Code</Label>
                    <Input
                      id="secret-code"
                      type="password" // Use password type to hide the code
                      placeholder="Enter secret code"
                      value={secretCode}
                      onChange={(e) => setSecretCode(e.target.value)}
                      required
                      autoComplete="off" // Prevent browser auto-filling
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
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
                  <Label htmlFor="confirm-password">Confirm Password</Label>
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
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Sign Up</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
