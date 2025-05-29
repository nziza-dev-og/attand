
"use client"; 

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardCheck, History, Bell, Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/useAuth'; 
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'; // Added collection, query, where, getDocs
import { db } from '@/lib/firebase';
import type { Teacher, UserProfile } from '@/lib/types'; 
import { useLanguage } from '@/contexts/LanguageContext'; 

export default function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth(); 
  const { translate } = useLanguage(); 
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [checkingSchoolCode, setCheckingSchoolCode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAttendanceToday, setNeedsAttendanceToday] = useState(true); // Example flag

  useEffect(() => {
    const fetchTeacherDataAndValidateSchoolCode = async () => {
      if (authLoading || !user) {
         if (!authLoading && !user) {
            setLoadingData(false); 
            setCheckingSchoolCode(false);
         }
        return;
      }

      setLoadingData(true);
      setCheckingSchoolCode(true);
      setError(null);
      try {
        const teacherDocRef = doc(db, 'users', user.uid);
        const teacherDocSnap = await getDoc(teacherDocRef);

        if (teacherDocSnap.exists()) {
          const data = teacherDocSnap.data() as UserProfile; // Get base UserProfile
          if (data.role === 'Teacher') {
            const teacherProfile = data as Teacher; // Cast to specific Teacher type
            setTeacherData(teacherProfile);
            setNeedsAttendanceToday(true); // Placeholder

            const enteredCode = teacherProfile.enteredSchoolCode;
            if (!enteredCode) {
              setError(translate('teacherMissingSchoolCodeError') || "Your account is not associated with a school code. Please contact your administrator.");
              setCheckingSchoolCode(false);
              setLoadingData(false);
              return;
            }

            const adminsQuery = query(
              collection(db, "users"),
              where("role", "==", "Admin"),
              where("schoolIdentifierCode", "==", enteredCode)
            );
            const adminSnap = await getDocs(adminsQuery);

            if (adminSnap.empty) {
              setError(translate('teacherInvalidSchoolCodeError') || "The school code associated with your account is not recognized. Please contact your administrator.");
            } else {
              // School code is valid
              setError(null); // Clear any previous error
            }
            
          } else {
            setError(translate('userNotTeacherError') || "User found but is not registered as a Teacher.");
            setTeacherData(null);
          }
        } else {
          setError(translate('teacherProfileError') || "Teacher profile not found.");
          setTeacherData(null);
        }
      } catch (err) {
        console.error("Error fetching teacher data or validating school code:", err);
        setError(translate('loadTeacherError') || "Failed to load teacher information or validate school association.");
        setTeacherData(null);
      } finally {
        setLoadingData(false);
        setCheckingSchoolCode(false);
      }
    };

    fetchTeacherDataAndValidateSchoolCode();
  }, [user, authLoading, translate]); 

  const isLoading = authLoading || loadingData || checkingSchoolCode;
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

   if (error) { // This will now catch school code errors as well
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

   if (!teacherData) { // Should be caught by error state if profile not found or not a teacher
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
               {assignedClassesCount === 0 && (
                 <p className="text-orange-600">{translate('teacherNoClassesAssigned') || "You are not currently assigned to any classes. Please contact your administrator."}</p>
               )}
               {needsAttendanceToday && assignedClassesCount > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800">
                       <Bell className="h-5 w-5" />
                       <span>{translate('teacherMarkAttendanceReminder') || "Remember to mark attendance for your classes today."}</span>
                   </div>
               )}
               <div className="flex gap-4">
                  <Button asChild disabled={assignedClassesCount === 0}>
                     <Link href="/teacher/mark-attendance">
                       <ClipboardCheck className="mr-2 h-4 w-4" /> {translate('markAttendance') || "Mark Attendance"}
                     </Link>
                  </Button>
                   <Button variant="outline" asChild disabled={assignedClassesCount === 0}>
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
             <Link href="/teacher/mark-attendance" className={cn("text-primary hover:underline", assignedClassesCount === 0 && "pointer-events-none text-muted-foreground")}>{translate('markAttendance') || "Mark Today's Attendance"}</Link>
             <Link href="/teacher/history" className={cn("text-primary hover:underline", assignedClassesCount === 0 && "pointer-events-none text-muted-foreground")}>{translate('teacherViewPastRecordsLink') || "View Past Records"}</Link>
             <Link href="/teacher/behavior-reports" className={cn("text-primary hover:underline", assignedClassesCount === 0 && "pointer-events-none text-muted-foreground")}>{translate('behaviorReports')}</Link>
           </CardContent>
         </Card>
    </div>
  );
}
