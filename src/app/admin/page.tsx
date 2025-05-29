
"use client"; 

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Activity, Users, School, ClipboardList, UserCircle, Image as ImageIcon, Save } from "lucide-react"; // Added UserCircle, ImageIcon, Save
import { collection, getCountFromServer, query, where, Timestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { format } from 'date-fns';
import { useLanguage } from "@/contexts/LanguageContext"; 
import { useEffect, useState } from "react"; 
import { useAuth } from "@/hooks/useAuth"; // Import useAuth
import { Button } from "@/components/ui/button"; // Import Button
import { Input } from "@/components/ui/input"; // Import Input
import { Label } from "@/components/ui/label"; // Import Label
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"; // Import Avatar components
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { Loader2 } from "lucide-react";

// Helper function to get initials from name
const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
};

async function getCollectionCount(collectionName: string, role?: 'Student' | 'Teacher' | 'Parent' | 'Admin'): Promise<number> {
  try {
    let q;
    if (role) {
       if (collectionName !== 'users') {
           console.warn(`Filtering by role is typically done on the 'users' collection, but requested for '${collectionName}'. Adjust if needed.`);
           q = query(collection(db, collectionName), where("role", "==", role));
       } else {
            q = query(collection(db, collectionName), where("role", "==", role));
       }
    } else {
      q = collection(db, collectionName);
    }
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error(`Error fetching count for ${collectionName}${role ? ` with role ${role}` : ''}:`, error);
    return 0;
  }
}

async function getAttendanceMarkedTodayCount(): Promise<number> {
    try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const startOfDay = Timestamp.fromDate(new Date(todayStr + 'T00:00:00'));
        const endOfDay = Timestamp.fromDate(new Date(todayStr + 'T23:59:59'));

        const q = query(
            collection(db, "attendanceRecords"),
            where("timestamp", ">=", startOfDay),
            where("timestamp", "<=", endOfDay)
        );
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        console.error("Error fetching attendance marked today:", error);
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
  const { user: authUser, loading: authLoading } = useAuth(); // Get authUser
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [adminName, setAdminName] = useState<string>("");
  const [adminAvatarUrl, setAdminAvatarUrl] = useState<string>("");
  const [newAvatarUrlInput, setNewAvatarUrlInput] = useState<string>("");
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingStats(true);
      const classesCount = await getCollectionCount('classes');
      const studentsCount = await getCollectionCount('users', 'Student');
      const teachersCount = await getCollectionCount('users', 'Teacher');
      const attendanceToday = await getAttendanceMarkedTodayCount();
      setStats({
        totalClasses: classesCount,
        totalStudents: studentsCount,
        totalTeachers: teachersCount,
        attendanceMarkedTodayCount: attendanceToday,
      });
      setLoadingStats(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchAdminProfile = async () => {
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
          } else {
             setAdminName(authUser.displayName || "Admin");
             setAdminAvatarUrl(authUser.photoURL || "");
             setNewAvatarUrlInput(authUser.photoURL || "");
          }
        } catch (error) {
          console.error("Error fetching admin profile:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not fetch admin profile." });
        } finally {
          setLoadingProfile(false);
        }
      } else if (!authLoading) {
        // If auth is done loading and no user, stop loading profile
        setLoadingProfile(false);
      }
    };
    fetchAdminProfile();
  }, [authUser, authLoading, toast]);

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
      // Update Firebase Auth profile
      if (auth.currentUser) { // Ensure auth.currentUser is used
        await updateProfile(auth.currentUser, { photoURL: newUrl });
      }
      // Update Firestore document
      const userDocRef = doc(db, 'users', authUser.uid);
      await updateDoc(userDocRef, { avatarUrl: newUrl });

      setAdminAvatarUrl(newUrl || ""); // Update local state
      toast({ title: "Success", description: "Profile picture updated successfully." });
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update profile picture." });
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  if (authLoading || loadingStats || loadingProfile) {
    return (
      <div className="flex flex-col space-y-4 p-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <Skeleton className="h-40 w-full rounded-lg md:col-span-2 lg:col-span-4" />
      </div>
    );
  }


  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translate('totalClasses') || 'Total Classes'}</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClasses}</div>
            <p className="text-xs text-muted-foreground">{translate('managedClasses')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translate('totalStudents') || 'Total Students'}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents}</div>
            <p className="text-xs text-muted-foreground">{translate('enrolledStudents') || 'Enrolled students'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translate('totalTeachers') || 'Total Teachers'}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">{translate('registeredTeachers') || 'Registered teachers'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translate('attendanceToday') || 'Attendance Today'}</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.attendanceMarkedTodayCount}</div>
            <p className="text-xs text-muted-foreground">{translate('recordsMarkedToday') || 'Records marked today'}</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="md:col-span-2 lg:col-span-4">
         <CardHeader>
             <CardTitle>{translate('welcomeAdminTitle') || 'Welcome, Admin!'}</CardTitle>
             <CardDescription>{translate('adminDashboardDescription') || "Use the sidebar to manage classes, students, teachers, parents, assignments, and view reports."}</CardDescription>
         </CardHeader>
         <CardContent>
             <p>{translate('adminDashboardHubMessage') || "This is your central hub for managing AttendEase."}</p>
         </CardContent>
      </Card>

      {/* Admin Profile Picture Update Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle className="h-6 w-6"/> Your Profile</CardTitle>
          <CardDescription>Update your display name and profile picture.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={adminAvatarUrl} alt={adminName} data-ai-hint="user avatar" />
                    <AvatarFallback>{getInitials(adminName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                    <p className="text-xl font-medium">{adminName}</p>
                    <p className="text-sm text-muted-foreground">{authUser?.email}</p>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="avatarUrlInput" className="flex items-center gap-1"><ImageIcon className="h-4 w-4"/> New Avatar URL</Label>
                <Input
                    id="avatarUrlInput"
                    type="url"
                    value={newAvatarUrlInput}
                    onChange={(e) => setNewAvatarUrlInput(e.target.value)}
                    placeholder="https://example.com/your-avatar.png"
                />
                 <p className="text-xs text-muted-foreground">Enter a valid image URL (e.g., ending in .png, .jpg).</p>
            </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleUpdateAdminAvatar} disabled={isUpdatingAvatar || authLoading}>
                {isUpdatingAvatar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Save Profile Picture
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
