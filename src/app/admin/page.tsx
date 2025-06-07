
"use client"; 

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Activity, Users, School, ClipboardList, UserCircle, ImageIcon, Save, RefreshCw, Copy, Edit, Building, Settings, Phone } from "lucide-react"; // Removed KeyRound
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

// Removed getInitials as it's not used directly here anymore

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
  const [adminSchoolName, setAdminSchoolName] = useState<string>(""); // Only need to display school name
  const [loadingSchoolName, setLoadingSchoolName] = useState(true);
  

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
    const fetchAdminSchoolName = async () => {
      if (authUser && adminSchoolId) { // Ensure adminSchoolId is also available (it should be if authUser is Admin)
        setLoadingSchoolName(true);
        try {
          const userDocRef = doc(db, 'users', authUser.uid); // Admin's doc
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setAdminSchoolName(userData.schoolName || "");
          }
        } catch (error) {
          console.error("Error fetching admin school name:", error);
          // Toast handled by profile page if settings load fails there
        } finally {
          setLoadingSchoolName(false);
        }
      } else if (!authLoading) {
        setLoadingSchoolName(false);
      }
    };
    fetchAdminSchoolName();
  }, [authUser, authLoading, adminSchoolId]);


  if (authLoading || loadingStats || loadingSchoolName) {
    return (
      <div className="flex flex-col space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
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
              <p className="mt-2 text-sm text-muted-foreground">
                {translate('adminProfileSettingsMovedNotice') || "Your profile and school settings (name, phone, identifier code) can be managed on your Profile page."}
              </p>
              <Button asChild variant="link" className="px-0">
                <Link href="/profile">{translate('goToProfilePage') || "Go to Profile Page"}</Link>
              </Button>
         </CardContent>
      </Card>

      {/* Removed Admin Profile & School Settings Card from here */}
      
    </div>
  );
}
