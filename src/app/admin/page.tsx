
"use client"; 

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Activity, Users, School, ClipboardList, UserCircle, ImageIcon, Save, RefreshCw, Copy, Edit, Building, Settings, Phone, KeyRound } from "lucide-react"; 
import { collection, getCountFromServer, query, where, Timestamp, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { format } from 'date-fns';
import { useLanguage } from "@/contexts/LanguageContext"; 
import { useEffect, useState } from "react"; 
import { useAuth } from "@/hooks/useAuth"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { useToast } from "@/hooks/use-toast"; 
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"; 
import { Skeleton } from "@/components/ui/skeleton"; 
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
};

async function getCollectionCountForSchool(collectionName: string, schoolId: string, role?: 'Student' | 'Teacher' | 'Parent' | 'Admin'): Promise<number> {
  try {
    let q;
    const baseCollection = collection(db, collectionName);
    let conditions = [where("schoolId", "==", schoolId)];

    if (role) {
       if (collectionName === 'users') {
            conditions.push(where("role", "==", role));
       } else {
            console.warn(`Role filtering on non-'users' collection '${collectionName}'. Ensure 'role' field exists or remove filter.`);
            conditions.push(where("role", "==", role));
       }
    }
    
    q = query(baseCollection, ...conditions);
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error(`Error fetching count for ${collectionName} in school ${schoolId}${role ? ` with role ${role}` : ''}:`, error);
    return 0;
  }
}

async function getAttendanceMarkedTodayCountForSchool(schoolId: string): Promise<number> {
    try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const startOfDay = Timestamp.fromDate(new Date(todayStr + 'T00:00:00'));
        const endOfDay = Timestamp.fromDate(new Date(todayStr + 'T23:59:59'));

        const q = query(
            collection(db, "attendanceRecords"),
            where("schoolId", "==", schoolId),
            where("timestamp", ">=", startOfDay),
            where("timestamp", "<=", endOfDay)
        );
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        console.error("Error fetching attendance marked today for school " + schoolId + ":", error);
        return 0;
    }
}


interface DashboardStats {
  totalClasses: number;
  totalStudents: number;
  totalTeachers: number;
  attendanceMarkedTodayCount: number;
}

export default function AdminDashboard() {
  const { translate } = useLanguage();
  const { user: authUser, schoolId: adminSchoolId, loading: authLoading } = useAuth(); 
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [adminName, setAdminName] = useState<string>("");
  const [adminAvatarUrl, setAdminAvatarUrl] = useState<string>("");
  const [newAvatarUrlInput, setNewAvatarUrlInput] = useState<string>("");
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const [schoolIdentifierCode, setSchoolIdentifierCode] = useState<string>("");
  const [schoolCodeInput, setSchoolCodeInput] = useState<string>("");
  const [isSavingCode, setIsSavingCode] = useState(false);

  const [adminSchoolName, setAdminSchoolName] = useState<string>("");
  const [schoolNameInput, setSchoolNameInput] = useState<string>("");
  const [isSavingSchoolName, setIsSavingSchoolName] = useState(false);

  const [adminPhoneNumber, setAdminPhoneNumber] = useState<string>("");
  const [phoneNumberInput, setPhoneNumberInput] = useState<string>("");
  const [isSavingPhoneNumber, setIsSavingPhoneNumber] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
      if (!adminSchoolId) {
        setLoadingStats(false);
        return;
      }
      setLoadingStats(true);
      const classesCount = await getCollectionCountForSchool('classes', adminSchoolId);
      const studentsCount = await getCollectionCountForSchool('users', adminSchoolId, 'Student');
      const teachersCount = await getCollectionCountForSchool('users', adminSchoolId, 'Teacher');
      const attendanceToday = await getAttendanceMarkedTodayCountForSchool(adminSchoolId);
      setStats({
        totalClasses: classesCount,
        totalStudents: studentsCount,
        totalTeachers: teachersCount,
        attendanceMarkedTodayCount: attendanceToday,
      });
      setLoadingStats(false);
    };
    if (!authLoading && adminSchoolId) {
        fetchData();
    } else if (!authLoading && !adminSchoolId) {
        setLoadingStats(false); 
    }
  }, [authLoading, adminSchoolId]);

  useEffect(() => {
    const fetchAdminProfileAndSettings = async () => {
      if (authUser) {
        setLoadingProfile(true);
        try {
          const userDocRef = doc(db, 'users', authUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setAdminName(userData.name || authUser.displayName || "Admin");
            setAdminAvatarUrl(userData.avatarUrl || authUser.photoURL || "");
            setNewAvatarUrlInput(userData.avatarUrl || authUser.photoURL || "");
            setSchoolIdentifierCode(userData.schoolIdentifierCode || "");
            setSchoolCodeInput(userData.schoolIdentifierCode || "");
            setAdminSchoolName(userData.schoolName || "");
            setSchoolNameInput(userData.schoolName || "");
            setAdminPhoneNumber(userData.phoneNumber || "");
            setPhoneNumberInput(userData.phoneNumber || "");
          } else {
             setAdminName(authUser.displayName || "Admin");
             setAdminAvatarUrl(authUser.photoURL || "");
             setNewAvatarUrlInput(authUser.photoURL || "");
             await setDoc(doc(db, 'users', authUser.uid), { 
               name: authUser.displayName || "Admin",
               email: authUser.email,
               role: 'Admin',
               createdAt: Timestamp.now(),
               avatarUrl: authUser.photoURL || "",
               schoolIdentifierCode: "", 
               schoolName: "",
               phoneNumber: "",
               schoolId: authUser.uid, 
             }, { merge: true });
             setSchoolIdentifierCode("");
             setSchoolCodeInput("");
             setAdminSchoolName("");
             setSchoolNameInput("");
             setAdminPhoneNumber("");
             setPhoneNumberInput("");
          }
        } catch (error) {
          console.error("Error fetching admin profile/settings:", error);
          toast({ variant: "destructive", title: translate('errorTitle'), description: translate('profileLoadFailed') });
        } finally {
          setLoadingProfile(false);
        }
      } else if (!authLoading) {
        setLoadingProfile(false);
      }
    };
    fetchAdminProfileAndSettings();
  }, [authUser, authLoading, toast, translate]);

  const handleUpdateAdminAvatar = async () => {
    if (!authUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }
    if (newAvatarUrlInput.trim() !== "" ) {
      try {
        new URL(newAvatarUrlInput.trim());
      } catch (_) {
        toast({ variant: "destructive", title: "Invalid URL", description: "Please enter a valid image URL." });
        return;
      }
    }

    setIsUpdatingAvatar(true);
    try {
      const newUrl = newAvatarUrlInput.trim() === "" ? null : newAvatarUrlInput.trim();
      if (auth.currentUser) { 
        await updateProfile(auth.currentUser, { photoURL: newUrl });
      }
      const userDocRef = doc(db, 'users', authUser.uid);
      await updateDoc(userDocRef, { avatarUrl: newUrl });

      setAdminAvatarUrl(newUrl || ""); 
      toast({ title: "Success", description: "Profile picture updated successfully." });
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update profile picture." });
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleSaveSchoolCode = async () => {
    if (!authUser) return;
    if (!schoolCodeInput.trim()) {
      toast({ variant: "destructive", title: translate('schoolCodeEmptyTitle'), description: translate('schoolCodeEmptyDesc') });
      return;
    }
    setIsSavingCode(true);
    try {
      const userDocRef = doc(db, 'users', authUser.uid);
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

  const handleSaveSchoolName = async () => {
    if (!authUser) return;
    if (!schoolNameInput.trim()) {
      toast({ variant: "destructive", title: translate('schoolNameEmptyTitle'), description: translate('schoolNameEmptyDesc') });
      return;
    }
    setIsSavingSchoolName(true);
    try {
      const userDocRef = doc(db, 'users', authUser.uid);
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
    if (!authUser) return;
    setIsSavingPhoneNumber(true);
    try {
      const userDocRef = doc(db, 'users', authUser.uid);
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


  const handleCopyCode = () => {
    if (schoolIdentifierCode) {
      navigator.clipboard.writeText(schoolIdentifierCode)
        .then(() => toast({ title: translate('schoolCodeCopiedTitle') }))
        .catch(err => toast({ variant: "destructive", title: translate('errorTitle'), description: translate('schoolCodeCopyFailed') }));
    }
  };

  if (authLoading || loadingStats || loadingProfile) {
    return (
      <div className="flex flex-col space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-60 w-full rounded-lg" />
        <Skeleton className="h-52 w-full rounded-lg" />
      </div>
    );
  }

  if (!adminSchoolId && !authLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-destructive">School Configuration Missing</CardTitle>
                <CardDescription>
                    Your admin account is not fully configured. Please contact support or ensure your school ID is set.
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }


  return (
    <div className="grid auto-rows-min gap-6">
      {/* Statistics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translate('totalClasses') || 'Total Classes'}</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClasses ?? 0}</div>
            <p className="text-xs text-muted-foreground">{translate('managedClasses')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translate('totalStudents') || 'Total Students'}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents ?? 0}</div>
            <p className="text-xs text-muted-foreground">{translate('enrolledStudents') || 'Enrolled students'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translate('totalTeachers') || 'Total Teachers'}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTeachers ?? 0}</div>
            <p className="text-xs text-muted-foreground">{translate('registeredTeachers') || 'Registered teachers'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translate('attendanceToday') || 'Attendance Today'}</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.attendanceMarkedTodayCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">{translate('recordsMarkedToday') || 'Records marked today'}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Welcome and School Info Card */}
      <Card>
         <CardHeader>
             <CardTitle>{translate('welcomeAdminTitle') || 'Welcome, Admin!'}{adminSchoolName ? ` - ${adminSchoolName}` : ''}</CardTitle>
             <CardDescription>{translate('adminDashboardDescription') || "Use the sidebar to manage classes, students, teachers, parents, assignments, and view reports."}</CardDescription>
         </CardHeader>
         <CardContent>
             <p>{translate('adminDashboardHubMessage') || "This is your central hub for managing AttendEase."}</p>
         </CardContent>
      </Card>

      {/* Admin Profile & School Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle className="h-6 w-6"/> {translate('profileAndSchoolSettingsTitle')}</CardTitle>
          <CardDescription>{translate('profileAndSchoolSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Profile Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2"><UserCircle className="h-5 w-5 text-primary"/>{translate('myProfileTitle')}</h3>
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={adminAvatarUrl} />
                        <AvatarFallback>{getInitials(adminName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                        <p className="text-xl font-medium">{adminName}</p>
                        <p className="text-sm text-muted-foreground">{authUser?.email}</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="avatarUrlInput" className="flex items-center gap-1"><ImageIcon className="h-4 w-4"/> {translate('avatarUrlLabel') || 'New Avatar URL'}</Label>
                    <Input
                        id="avatarUrlInput"
                        type="url"
                        value={newAvatarUrlInput}
                        onChange={(e) => setNewAvatarUrlInput(e.target.value)}
                        placeholder="https://example.com/your-avatar.png"
                    />
                    <p className="text-xs text-muted-foreground">{translate('avatarUrlHint') || 'Enter a valid image URL (e.g., ending in .png, .jpg).'}</p>
                </div>
                 <Button onClick={handleUpdateAdminAvatar} disabled={isUpdatingAvatar || authLoading} size="sm">
                    {isUpdatingAvatar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> {translate('saveProfilePictureButton') || 'Save Profile Picture'}
                </Button>
            </div>

            <Separator />

            {/* School Settings Section */}
             <div className="space-y-6">
                <h3 className="text-lg font-medium flex items-center gap-2"><Settings className="h-5 w-5 text-primary"/>{translate('schoolSettingsTitle')}</h3>
                {/* School Name Setting */}
                <div className="space-y-2">
                    <Label htmlFor="schoolNameInput" className="text-sm font-medium flex items-center gap-1"><Building className="h-4 w-4"/>{translate('setSchoolNameLabel')}</Label>
                    <div className="flex items-center gap-2">
                        <Input
                        id="schoolNameInput"
                        value={schoolNameInput}
                        onChange={(e) => setSchoolNameInput(e.target.value)}
                        placeholder={translate('enterSchoolNamePlaceholder')}
                        className="flex-1"
                        />
                        <Button onClick={handleSaveSchoolName} disabled={isSavingSchoolName || !authUser} size="sm">
                        {isSavingSchoolName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {translate('saveSchoolNameButton')}
                        </Button>
                    </div>
                </div>
                {/* School Phone Number Setting */}
                <div className="space-y-2">
                    <Label htmlFor="phoneNumberInput" className="text-sm font-medium flex items-center gap-1"><Phone className="h-4 w-4"/>{translate('setSchoolPhoneNumberLabel')}</Label>
                    <div className="flex items-center gap-2">
                        <Input
                        id="phoneNumberInput"
                        type="tel" 
                        value={phoneNumberInput}
                        onChange={(e) => setPhoneNumberInput(e.target.value)}
                        placeholder={translate('enterSchoolPhoneNumberPlaceholder')}
                        className="flex-1"
                        />
                        <Button onClick={handleSavePhoneNumber} disabled={isSavingPhoneNumber || !authUser} size="sm">
                        {isSavingPhoneNumber ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {translate('savePhoneNumberButton')}
                        </Button>
                    </div>
                </div>
                {/* School Identifier Code Setting */}
                <div className="space-y-2">
                    <Label htmlFor="schoolCodeInput" className="text-sm font-medium flex items-center gap-1"><KeyRound className="h-4 w-4"/>{translate('setSchoolCodeLabel')}</Label>
                    <div className="flex items-center gap-2 mt-1">
                    <Input
                        id="schoolCodeInput"
                        value={schoolCodeInput}
                        onChange={(e) => setSchoolCodeInput(e.target.value)}
                        placeholder={translate('enterSchoolCodePlaceholder')}
                        className="flex-1"
                    />
                    <Button onClick={handleSaveSchoolCode} disabled={isSavingCode || !authUser} size="sm">
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
        </CardContent>
        {/* No CardFooter needed for this combined card as save buttons are inline */}
      </Card>
    </div>
  );
}
