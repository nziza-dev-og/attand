
"use client"; 

import Link from 'next/link'; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Activity, Users, School, ClipboardList, UserCircle, ImageIcon, Save, RefreshCw, Copy, Edit, Building, Settings, Phone, KeyRound, Info, CheckCircle, XCircle, Clock, ClipboardCheck } from "lucide-react"; 
import { collection, getCountFromServer, query, where, Timestamp, doc, updateDoc, getDoc, setDoc, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { format, startOfDay, endOfDay } from 'date-fns';
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
import type { AttendanceRecord, UserProfile } from '@/lib/types';


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

interface DailySummary {
    present: number;
    absent: number;
    late: number;
    totalRecords: number;
    markedClassesCount: number;
}

async function getDailyAttendanceSummaryForSchool(schoolId: string): Promise<DailySummary> {
    try {
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);

        const startTimestamp = Timestamp.fromDate(start);
        const endTimestamp = Timestamp.fromDate(end);

        const q = query(
            collection(db, "attendanceRecords"),
            where("schoolId", "==", schoolId),
            where("timestamp", ">=", startTimestamp),
            where("timestamp", "<=", endTimestamp)
        );
        const querySnapshot = await getDocs(q);
        
        const summary: Omit<DailySummary, 'markedClassesCount'> = { present: 0, absent: 0, late: 0, totalRecords: querySnapshot.size };
        const markedClassIds = new Set<string>();

        querySnapshot.forEach(doc => {
            const record = doc.data() as AttendanceRecord;
            markedClassIds.add(record.classId);
            switch(record.status) {
                case 'present':
                    summary.present++;
                    break;
                case 'absent':
                    summary.absent++;
                    break;
                case 'late':
                    summary.late++;
                    break;
            }
        });

        return { ...summary, markedClassesCount: markedClassIds.size };
    } catch (error) {
        console.error("Error fetching daily attendance summary for school " + schoolId + ":", error);
        return { present: 0, absent: 0, late: 0, totalRecords: 0, markedClassesCount: 0 };
    }
}


interface DashboardStats {
  totalClasses: number;
  totalStudents: number;
  totalTeachers: number;
  dailySummary: DailySummary;
}

export default function AdminDashboard() {
  const { translate } = useLanguage();
  const { user: authUser, schoolId: adminSchoolId, loading: authLoading } = useAuth(); 
  const { toast } = useToast(); 

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [adminSchoolName, setAdminSchoolName] = useState<string>(""); 
  const [loadingSchoolName, setLoadingSchoolName] = useState(true);
  

  useEffect(() => {
    const fetchData = async () => {
      if (!adminSchoolId) {
        setLoadingStats(false);
        return;
      }
      setLoadingStats(true);
      const [classesCount, studentsCount, teachersCount, summary] = await Promise.all([
          getCollectionCountForSchool('classes', adminSchoolId),
          getCollectionCountForSchool('users', adminSchoolId, 'Student'),
          getCollectionCountForSchool('users', adminSchoolId, 'Teacher'),
          getDailyAttendanceSummaryForSchool(adminSchoolId)
      ]);
      setStats({
        totalClasses: classesCount,
        totalStudents: studentsCount,
        totalTeachers: teachersCount,
        dailySummary: summary,
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
      if (authUser && adminSchoolId) { 
        setLoadingSchoolName(true);
        try {
          const userDocRef = doc(db, 'users', authUser.uid); 
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setAdminSchoolName(userData.schoolName || "");
          }
        } catch (error) {
          console.error("Error fetching admin school name:", error);
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
      {/* School Statistics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      </div>

       {/* Daily Attendance Summary Row */}
       <Card>
         <CardHeader>
            <CardTitle>{translate('attendanceToday', 'Attendance Today')} ({format(new Date(), 'PPP')})</CardTitle>
            <CardDescription>{translate('dailyAttendanceSummary', 'A summary of attendance records marked today.')}</CardDescription>
         </CardHeader>
         <CardContent>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Present</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.dailySummary.present ?? 0}</div>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Absent</CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.dailySummary.absent ?? 0}</div>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Late</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.dailySummary.late ?? 0}</div>
                  </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{translate('classesReportedToday', 'Classes Reported Today')}</CardTitle>
                        <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.dailySummary.markedClassesCount ?? 0} / {stats?.totalClasses ?? 0}
                        </div>
                        <p className="text-xs text-muted-foreground">{translate('classesMarkedOutOfTotal', 'Classes that have marked attendance')}</p>
                    </CardContent>
                </Card>
             </div>
         </CardContent>
       </Card>
      
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
    </div>
  );
}
