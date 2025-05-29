
"use client"; 

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardCheck, History, Bell, Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/useAuth'; 
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Teacher } from '@/lib/types'; 
import { useLanguage } from '@/contexts/LanguageContext'; // Import useLanguage

export default function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth(); 
  const { translate } = useLanguage(); // Initialize useLanguage
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAttendanceToday, setNeedsAttendanceToday] = useState(true); // Example flag

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (authLoading || !user) {
         if (!authLoading && !user) setLoadingData(false); 
        return;
      }

      setLoadingData(true);
      setError(null);
      try {
        const teacherDocRef = doc(db, 'users', user.uid);
        const teacherDocSnap = await getDoc(teacherDocRef);

        if (teacherDocSnap.exists() && teacherDocSnap.data().role === 'Teacher') {
          const data = teacherDocSnap.data();
          setTeacherData({
             id: user.uid,
             name: data.name || user.displayName || user.email || translate('teacherFallbackName') || 'Teacher', 
             email: user.email || '',
             assignedClassIds: data.assignedClassIds || [], 
          } as Teacher); 
          setNeedsAttendanceToday(true); // Placeholder
        } else {
            if (teacherDocSnap.exists()) {
                setError(translate('userNotTeacherError') || "User found but is not registered as a Teacher.");
            } else {
                setError(translate('teacherProfileError') || "Teacher profile not found.");
            }
          setTeacherData(null);
        }
      } catch (err) {
        console.error("Error fetching teacher data:", err);
        setError(translate('loadTeacherError') || "Failed to load teacher information.");
        setTeacherData(null);
      } finally {
        setLoadingData(false);
      }
    };

    fetchTeacherData();
  }, [user, authLoading, translate]); 

  const isLoading = authLoading || loadingData;
  const assignedClassesCount = teacherData?.assignedClassIds?.length ?? 0;
  const teacherName = teacherData?.name || (user?.displayName || user?.email || translate('teacherFallbackName') || 'Teacher');


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{translate('loadingDashboard') || "Loading dashboard..."}</span>
      </div>
    );
  }

   if (error) {
      return (
         <Card className="md:col-span-2 lg:col-span-3 border-destructive bg-destructive/10">
            <CardHeader>
               <CardTitle className="text-destructive">{translate('errorTitle') || "Error"}</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-destructive">{error}</p>
                <p className="mt-2 text-sm text-muted-foreground">{translate('contactSupportError') || "Please contact support if the issue persists."}</p>
            </CardContent>
         </Card>
      );
   }

   if (!teacherData) {
     return (
         <Card className="md:col-span-2 lg:col-span-3">
             <CardHeader>
                 <CardTitle>{translate('noTeacherDataTitle') || "No Teacher Data"}</CardTitle>
                 <CardDescription>{translate('noTeacherDataDesc') || "Could not find teacher information."}</CardDescription>
             </CardHeader>
         </Card>
     );
   }


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
       <Card className="md:col-span-2 lg:col-span-3">
           <CardHeader>
               <CardTitle>{translate('welcomeMessage', { name: teacherName })}</CardTitle>
               <CardDescription>{translate('teacherDashboardDesc') || "Your dashboard for managing class attendance."}</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
               <p>{translate('teacherAssignedClassesInfo', { count: assignedClassesCount.toString() })}</p>
               {needsAttendanceToday && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800">
                       <Bell className="h-5 w-5" />
                       <span>{translate('teacherMarkAttendanceReminder') || "Remember to mark attendance for your classes today."}</span>
                   </div>
               )}
               <div className="flex gap-4">
                  <Button asChild>
                     <Link href="/teacher/mark-attendance">
                       <ClipboardCheck className="mr-2 h-4 w-4" /> {translate('markAttendance') || "Mark Attendance"}
                     </Link>
                  </Button>
                   <Button variant="outline" asChild>
                     <Link href="/teacher/history">
                        <History className="mr-2 h-4 w-4" /> {translate('attendanceHistory') || "View History"}
                     </Link>
                   </Button>
               </div>
           </CardContent>
        </Card>

         <Card>
           <CardHeader>
             <CardTitle className="text-lg">{translate('teacherQuickLinksTitle') || "Quick Links"}</CardTitle>
           </CardHeader>
           <CardContent className="flex flex-col gap-2">
             <Link href="/teacher/mark-attendance" className="text-primary hover:underline">{translate('markAttendance') || "Mark Today's Attendance"}</Link>
             <Link href="/teacher/history" className="text-primary hover:underline">{translate('teacherViewPastRecordsLink') || "View Past Records"}</Link>
           </CardContent>
         </Card>
    </div>
  );
}
