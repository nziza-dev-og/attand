
// src/app/profile/page.tsx
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, Save, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
};

export default function ProfilePage() {
  const { user, loading: authLoading, role } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { translate } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currentAvatarDisplay, setCurrentAvatarDisplay] = useState('');

  const [loadingProfileData, setLoadingProfileData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchProfileData = async () => {
      setLoadingProfileData(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setName(userData.name || user.displayName || '');
          setEmail(user.email || '');
          setAvatarUrl(userData.avatarUrl || user.photoURL || '');
          setCurrentAvatarDisplay(userData.avatarUrl || user.photoURL || '');
        } else {
          // Fallback to auth data if Firestore doc doesn't exist (should be rare after signup)
          setName(user.displayName || '');
          setEmail(user.email || '');
          setAvatarUrl(user.photoURL || '');
          setCurrentAvatarDisplay(user.photoURL || '');
          toast({ variant: 'destructive', title: translate('errorTitle'), description: translate('profileDataMissing') });
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
        toast({ variant: 'destructive', title: translate('errorTitle'), description: translate('profileLoadFailed') });
      } finally {
        setLoadingProfileData(false);
      }
    };

    fetchProfileData();
  }, [user, authLoading, router, toast, translate]);

  const handleAvatarUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarUrl(e.target.value);
    // Optionally update currentAvatarDisplay in real-time, or only on save
    // For simplicity, let's update it here to give immediate visual feedback
    setCurrentAvatarDisplay(e.target.value);
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (avatarUrl.trim() !== "" ) {
      try {
        new URL(avatarUrl.trim());
      } catch (_) {
        toast({ variant: "destructive", title: translate('invalidUrlTitle'), description: translate('invalidUrlDesc') });
        return;
      }
    }

    setIsSaving(true);
    try {
      const newName = name.trim();
      const newAvatar = avatarUrl.trim() === "" ? null : avatarUrl.trim();

      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: newName,
          photoURL: newAvatar,
        });
      }

      // Update Firestore document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: newName,
        avatarUrl: newAvatar,
      });

      setCurrentAvatarDisplay(newAvatar || ''); // Update display after successful save
      toast({ title: translate('profileUpdateSuccessTitle'), description: translate('profileUpdateSuccessDesc') });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ variant: "destructive", title: translate('errorTitle'), description: translate('profileUpdateFailed') });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loadingProfileData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{translate('loadingProfile')}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <UserCircle className="h-7 w-7" /> {translate('myProfileTitle')}
          </CardTitle>
          <CardDescription>{translate('myProfileDesc')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveProfile}>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32 border-4 border-primary shadow-lg">
                <AvatarImage src={currentAvatarDisplay} alt={name} />
                <AvatarFallback className="text-4xl">{getInitials(name)}</AvatarFallback>
              </Avatar>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">{translate('nameLabel')}</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-base"
                placeholder={translate('enterYourName')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">{translate('emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                readOnly
                disabled
                className="text-base bg-muted/50 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl" className="text-base flex items-center gap-1">
                <ImageIcon className="h-5 w-5"/> {translate('avatarUrlLabel')}
              </Label>
              <Input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={handleAvatarUrlChange}
                placeholder="https://example.com/your-avatar.png"
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">{translate('avatarUrlHint')}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving} className="w-full text-lg py-6">
              {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              {translate('saveChanges')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
