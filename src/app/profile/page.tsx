
// src/app/profile/page.tsx
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'; // Added setDoc
import { updateProfile } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, Save, Image as ImageIcon, Building, Settings, Phone, KeyRound, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Separator } from '@/components/ui/separator'; // Import Separator

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
};

export default function ProfilePage() {
  const { user, loading: authLoading, role } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { translate } = useLanguage();

  // General profile state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currentAvatarDisplay, setCurrentAvatarDisplay] = useState('');

  // Admin-specific school settings state
  const [schoolIdentifierCode, setSchoolIdentifierCode] = useState<string>("");
  const [schoolCodeInput, setSchoolCodeInput] = useState<string>("");
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [adminSchoolName, setAdminSchoolName] = useState<string>("");
  const [schoolNameInput, setSchoolNameInput] = useState<string>("");
  const [isSavingSchoolName, setIsSavingSchoolName] = useState(false);
  const [adminPhoneNumber, setAdminPhoneNumber] = useState<string>("");
  const [phoneNumberInput, setPhoneNumberInput] = useState<string>("");
  const [isSavingPhoneNumber, setIsSavingPhoneNumber] = useState(false);

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

          if (role === 'Admin') {
            setAdminSchoolName(userData.schoolName || "");
            setSchoolNameInput(userData.schoolName || "");
            setAdminPhoneNumber(userData.phoneNumber || "");
            setPhoneNumberInput(userData.phoneNumber || "");
            setSchoolIdentifierCode(userData.schoolIdentifierCode || "");
            setSchoolCodeInput(userData.schoolIdentifierCode || "");
          }

        } else {
          setName(user.displayName || '');
          setEmail(user.email || '');
          setAvatarUrl(user.photoURL || '');
          setCurrentAvatarDisplay(user.photoURL || '');
          toast({ variant: 'destructive', title: translate('errorTitle'), description: translate('profileDataMissing') });
          // For a new admin, initialize fields if document doesn't exist (should be rare after login setup)
          if (role === 'Admin') {
            await setDoc(userDocRef, {
                name: user.displayName || '',
                email: user.email,
                role: 'Admin',
                schoolId: user.uid, // Admin's own UID is their schoolId
                schoolName: "",
                phoneNumber: "",
                schoolIdentifierCode: "",
                isSchoolCodeVerified: true,
                avatarUrl: user.photoURL || null,
            }, { merge: true });
          }
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
        toast({ variant: 'destructive', title: translate('errorTitle'), description: translate('profileLoadFailed') });
      } finally {
        setLoadingProfileData(false);
      }
    };

    fetchProfileData();
  }, [user, authLoading, router, toast, translate, role]);

  const handleAvatarUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarUrl(e.target.value);
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

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: newName,
          photoURL: newAvatar,
        });
      }

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: newName,
        avatarUrl: newAvatar,
      });

      setCurrentAvatarDisplay(newAvatar || '');
      toast({ title: translate('profileUpdateSuccessTitle'), description: translate('profileUpdateSuccessDesc') });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ variant: "destructive", title: translate('errorTitle'), description: translate('profileUpdateFailed') });
    } finally {
      setIsSaving(false);
    }
  };

  // Admin-specific school settings handlers
  const handleSaveSchoolName = async () => {
    if (!user || role !== 'Admin') return;
    if (!schoolNameInput.trim()) {
      toast({ variant: "destructive", title: translate('schoolNameEmptyTitle'), description: translate('schoolNameEmptyDesc') });
      return;
    }
    setIsSavingSchoolName(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { schoolName: schoolNameInput.trim() });
      setAdminSchoolName(schoolNameInput.trim());
      toast({ title: translate('schoolNameSavedTitle'), description: translate('schoolNameSavedDesc') });
    } catch (error) {
      console.error("Error saving school name:", error);
      toast({ variant: "destructive", title: translate('errorTitle'), description: translate('schoolNameSaveFailed') });
    } finally {
      setIsSavingSchoolName(false);
    }
  };

  const handleSavePhoneNumber = async () => {
    if (!user || role !== 'Admin') return;
    setIsSavingPhoneNumber(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { phoneNumber: phoneNumberInput.trim() || null });
      setAdminPhoneNumber(phoneNumberInput.trim());
      toast({ title: translate('phoneNumberSavedTitle'), description: translate('phoneNumberSavedDesc') });
    } catch (error) {
      console.error("Error saving phone number:", error);
      toast({ variant: "destructive", title: translate('errorTitle'), description: translate('phoneNumberSaveFailed') });
    } finally {
      setIsSavingPhoneNumber(false);
    }
  };
  
  const handleSaveSchoolCode = async () => {
    if (!user || role !== 'Admin') return;
    if (!schoolCodeInput.trim()) {
      toast({ variant: "destructive", title: translate('schoolCodeEmptyTitle'), description: translate('schoolCodeEmptyDesc') });
      return;
    }
    setIsSavingCode(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { schoolIdentifierCode: schoolCodeInput.trim() });
      setSchoolIdentifierCode(schoolCodeInput.trim());
      toast({ title: translate('schoolCodeSavedTitle'), description: translate('schoolCodeSavedDesc') });
    } catch (error) {
      console.error("Error saving school code:", error);
      toast({ variant: "destructive", title: translate('errorTitle'), description: translate('schoolCodeSaveFailed') });
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (schoolIdentifierCode) {
      navigator.clipboard.writeText(schoolIdentifierCode)
        .then(() => toast({ title: translate('schoolCodeCopiedTitle') }))
        .catch(err => toast({ variant: "destructive", title: translate('errorTitle'), description: translate('schoolCodeCopyFailed') }));
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
            <UserCircle className="h-7 w-7" /> 
            {role === 'Admin' ? translate('profileAndSchoolSettingsTitle') : translate('myProfileTitle')}
          </CardTitle>
          <CardDescription>
            {role === 'Admin' ? translate('profileAndSchoolSettingsDesc') : translate('myProfileDesc')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveProfile}>
          <CardContent className="space-y-6">
            {/* General Profile Section */}
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
            <Button type="submit" disabled={isSaving} className="w-full text-lg py-3">
              {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              {translate('saveChanges')}
            </Button>

            {/* Admin-specific School Settings Section */}
            {role === 'Admin' && (
              <>
                <Separator className="my-6" />
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Settings className="h-6 w-6 text-primary"/>
                    {translate('schoolSettingsTitle')}
                  </h3>
                  
                  {/* School Name Setting */}
                  <div className="space-y-2">
                      <Label htmlFor="schoolNameInput" className="text-base flex items-center gap-1"><Building className="h-5 w-5"/>{translate('setSchoolNameLabel')}</Label>
                      <div className="flex items-center gap-2">
                          <Input
                          id="schoolNameInput"
                          value={schoolNameInput}
                          onChange={(e) => setSchoolNameInput(e.target.value)}
                          placeholder={translate('enterSchoolNamePlaceholder')}
                          className="flex-1 text-base"
                          />
                          <Button onClick={handleSaveSchoolName} disabled={isSavingSchoolName || !user} size="sm">
                          {isSavingSchoolName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          {translate('saveSchoolNameButton')}
                          </Button>
                      </div>
                  </div>
                  {/* School Phone Number Setting */}
                  <div className="space-y-2">
                      <Label htmlFor="phoneNumberInput" className="text-base flex items-center gap-1"><Phone className="h-5 w-5"/>{translate('setSchoolPhoneNumberLabel')}</Label>
                      <div className="flex items-center gap-2">
                          <Input
                          id="phoneNumberInput"
                          type="tel" 
                          value={phoneNumberInput}
                          onChange={(e) => setPhoneNumberInput(e.target.value)}
                          placeholder={translate('enterSchoolPhoneNumberPlaceholder')}
                          className="flex-1 text-base"
                          />
                          <Button onClick={handleSavePhoneNumber} disabled={isSavingPhoneNumber || !user} size="sm">
                          {isSavingPhoneNumber ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          {translate('savePhoneNumberButton')}
                          </Button>
                      </div>
                  </div>
                  {/* School Identifier Code Setting */}
                  <div className="space-y-2">
                      <Label htmlFor="schoolCodeInput" className="text-base flex items-center gap-1"><KeyRound className="h-5 w-5"/>{translate('setSchoolCodeLabel')}</Label>
                      <div className="flex items-center gap-2 mt-1">
                      <Input
                          id="schoolCodeInput"
                          value={schoolCodeInput}
                          onChange={(e) => setSchoolCodeInput(e.target.value)}
                          placeholder={translate('enterSchoolCodePlaceholder')}
                          className="flex-1 text-base"
                      />
                      <Button onClick={handleSaveSchoolCode} disabled={isSavingCode || !user} size="sm">
                          {isSavingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          {translate('saveSchoolCodeButton')}
                      </Button>
                      </div>
                  </div>
                  {schoolIdentifierCode && (
                      <div>
                      <Label className="text-sm font-medium">{translate('currentSchoolCodeLabel')}</Label>
                      <div className="flex items-center justify-between p-3 mt-1 border rounded-md bg-secondary">
                          <span className="text-lg font-mono tracking-wider">{schoolIdentifierCode}</span>
                          <Button variant="ghost" size="icon" onClick={handleCopyCode} title={translate('copyCodeButton')}>
                          <Copy className="h-5 w-5" />
                          </Button>
                      </div>
                      </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
          {/* Footer is removed as save button is part of the form content now for general profile */}
          {/* If Admin section had its own footer/save button, it would go inside the role === 'Admin' block */}
        </form>
      </Card>
    </div>
  );
}

