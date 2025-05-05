"use client"; // Make this a client component to use hooks

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardCheck, History, Bell, Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/useAuth'; // Use the auth hook
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Teacher } from '@/lib/types'; // Import the Teacher type

export default function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth(); // Get user and loading state
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Example flag - Needs real logic based on fetched data
  const [needsAttendanceToday, setNeedsAttendanceToday] = useState(true);

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (authLoading || !user) {
        // Wait for auth state to resolve or if no user, do nothing
         if (!authLoading && !user) setLoadingData(false); // Stop loading if auth resolved and no user
        return;
      }

      setLoadingData(true);
      setError(null);
      try {
        // Fetch teacher data from 'users' collection using user's UID
        const teacherDocRef = doc(db, 'users', user.uid);
        const teacherDocSnap = await getDoc(teacherDocRef);

        if (teacherDocSnap.exists() && teacherDocSnap.data().role === 'Teacher') {
           // Basic validation: Ensure the user is indeed a teacher
           // Assuming assignedClassIds might be stored directly on the user document
           // or potentially on a separate 'teachers' document referenced by UID.
           // Adjust based on your actual Firestore structure.
           // Let's assume 'assignedClassIds' is on the 'users' doc for now.
          setTeacherData({
             id: user.uid,
             name: teacherDocSnap.data().name || user.email || 'Teacher', // Get name or fallback
             email: user.email || '',
             assignedClassIds: teacherDocSnap.data().assignedClassIds || [], // Get assigned classes
          } as Teacher); // Cast or ensure the fetched data matches the Teacher type

          // TODO: Implement logic to check if attendance needs marking today
          // This might involve querying 'attendanceRecords' for the teacher's classes for today's date
          // and comparing against expected records. Keeping it simple for now.
          setNeedsAttendanceToday(true);

        } else {
            if (teacherDocSnap.exists()) {
                setError("User found but is not registered as a Teacher.");
            } else {
                setError("Teacher profile not found.");
            }
          setTeacherData(null);
        }
      } catch (err) {
        console.error("Error fetching teacher data:", err);
        setError("Failed to load teacher information.");
        setTeacherData(null);
      } finally {
        setLoadingData(false);
      }
    };

    fetchTeacherData();
  }, [user, authLoading]); // Rerun when user or authLoading changes

  const isLoading = authLoading || loadingData;
  const assignedClassesCount = teacherData?.assignedClassIds?.length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

   if (error) {
      return (
         <Card className="md:col-span-2 lg:col-span-3 border-destructive bg-destructive/10">
            <CardHeader>
               <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-destructive">{error}</p>
                <p className="mt-2 text-sm text-muted-foreground">Please contact support if the issue persists.</p>
            </CardContent>
         </Card>
      );
   }

   if (!teacherData) {
     return (
         <Card className="md:col-span-2 lg:col-span-3">
             <CardHeader>
                 <CardTitle>No Teacher Data</CardTitle>
                 <CardDescription>Could not find teacher information.</CardDescription>
             </CardHeader>
         </Card>
     );
   }


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
       <Card className="md:col-span-2 lg:col-span-3">
           <CardHeader>
               <CardTitle>Welcome, {teacherData?.name || 'Teacher'}!</CardTitle>
               <CardDescription>Your dashboard for managing class attendance.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
               <p>You are assigned to <span className="font-semibold">{assignedClassesCount}</span> class{assignedClassesCount !== 1 ? 'es' : ''}.</p>
               {needsAttendanceToday && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800">
                       <Bell className="h-5 w-5" />
                       <span>Remember to mark attendance for your classes today.</span>
                   </div>
               )}
               <div className="flex gap-4">
                  <Button asChild>
                     <Link href="/teacher/mark-attendance">
                       <ClipboardCheck className="mr-2 h-4 w-4" /> Mark Attendance
                     </Link>
                  </Button>
                   <Button variant="outline" asChild>
                     <Link href="/teacher/history">
                        <History className="mr-2 h-4 w-4" /> View History
                     </Link>
                   </Button>
               </div>
           </CardContent>
        </Card>

        {/* Placeholder for additional widgets like upcoming schedule or recent activity */}
         <Card>
           <CardHeader>
             <CardTitle className="text-lg">Quick Links</CardTitle>
           </CardHeader>
           <CardContent className="flex flex-col gap-2">
             <Link href="/teacher/mark-attendance" className="text-primary hover:underline">Mark Today's Attendance</Link>
             <Link href="/teacher/history" className="text-primary hover:underline">View Past Records</Link>
             {/* Add link to view assigned classes if needed */}
             {/* Example: <Link href="/teacher/classes" className="text-primary hover:underline">View Assigned Classes</Link> */}
           </CardContent>
         </Card>
    </div>
  );
}