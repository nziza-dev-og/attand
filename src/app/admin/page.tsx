
"use client"; // Added use client for useLanguage hook

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Activity, Users, School, ClipboardList } from "lucide-react";
import { collection, getCountFromServer, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from 'date-fns';
import { useLanguage } from "@/contexts/LanguageContext"; // Import useLanguage
import { useEffect, useState } from "react"; // Import useEffect and useState

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading || !stats) {
    // You can replace this with a Skeleton loader component if you have one
    return <div className="flex justify-center items-center h-64">Loading dashboard data...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{translate('totalClasses') || 'Total Classes'}</CardTitle>
          <School className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalClasses}</div>
          <p className="text-xs text-muted-foreground">{translate('managedClasses')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{translate('totalStudents') || 'Total Students'}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalStudents}</div>
          <p className="text-xs text-muted-foreground">{translate('enrolledStudents') || 'Enrolled students'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{translate('totalTeachers') || 'Total Teachers'}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTeachers}</div>
          <p className="text-xs text-muted-foreground">{translate('registeredTeachers') || 'Registered teachers'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{translate('attendanceToday') || 'Attendance Today'}</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.attendanceMarkedTodayCount}</div>
          <p className="text-xs text-muted-foreground">{translate('recordsMarkedToday') || 'Records marked today'}</p>
        </CardContent>
      </Card>

        <Card className="md:col-span-2 lg:col-span-4">
           <CardHeader>
               <CardTitle>{translate('welcomeAdminTitle') || 'Welcome, Admin!'}</CardTitle>
               <CardDescription>{translate('adminDashboardDescription') || "Use the sidebar to manage classes, students, teachers, parents, assignments, and view reports."}</CardDescription>
           </CardHeader>
           <CardContent>
               <p>{translate('adminDashboardHubMessage') || "This is your central hub for managing AttendEase."}</p>
           </CardContent>
        </Card>
    </div>
  );
}
