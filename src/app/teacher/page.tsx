
"use client"; 

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardCheck, History, Bell, Loader2, Info } from "lucide-react";
import { useAuth } from '@/hooks/useAuth'; 
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Teacher, UserProfile } from '@/lib/types'; 
import { useLanguage } from '@/contexts/LanguageContext'; 
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast"; // Added missing import

interface SchoolAdminDetails {
  name?: string;
  email?: string;
  phoneNumber?: string;
  schoolName?: string;
}

export default function TeacherDashboard() {
  const { user, loading: authLoading, role, isSchoolCodeVerified, schoolId } = useAuth(); 
  const { translate } = useLanguage(); 
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAttendanceToday, setNeedsAttendanceToday] = useState(true); // Placeholder

  const [schoolAdminDetails, setSchoolAdminDetails] = useState<SchoolAdminDetails | null>(null);
  const [loadingAdminDetails, setLoadingAdminDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTeacherAndAdminData = async () => {
      if (authLoading || !user || role !== 'Teacher' || isSchoolCodeVerified !== true) {
        if (!authLoading && ((user && role === 'Teacher' && isSchoolCodeVerified !== true) || !user)) {
          setLoadingData(false);
          setLoadingAdminDetails(false);
        }
        return;
      }

      setLoadingData(true);
      setError(null);
      try {
        const teacherDocRef = doc(db, 'users', user.uid);
        const teacherDocSnap = await getDoc(teacherDocRef);

        if (teacherDocSnap.exists()) {
          const data = teacherDocSnap.data() as Teacher; 
          if (data.role === 'Teacher') {
            setTeacherData(data);
            setNeedsAttendanceToday(true); 

            // Fetch School Admin Details if schoolId is present
            if (data.schoolId) {
              setLoadingAdminDetails(true);
              try {
                const adminDocRef = doc(db, 'users', data.schoolId);
                const adminDocSnap = await getDoc(adminDocRef);
                if (adminDocSnap.exists()) {
                  const adminData = adminDocSnap.data() as UserProfile;
                  setSchoolAdminDetails({
                    name: adminData.name,
                    email: adminData.email,
                    phoneNumber: adminData.phoneNumber,
                    schoolName: adminData.schoolName,
                  });
                } else {
                  console.warn(`Admin details not found for schoolId: ${data.schoolId}`);
                  setSchoolAdminDetails(null);
                }
              } catch (adminError) {
                console.error("Error fetching school admin details:", adminError);
                setSchoolAdminDetails(null);
                toast({ variant: "destructive", title: translate('errorTitle'), description: translate('errorLoadingAdminDetails')});
              } finally {
                setLoadingAdminDetails(false);
              }
            } else {
              setSchoolAdminDetails(null);
              setLoadingAdminDetails(false);
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
        console.error("Error fetching teacher data:", err);
        setError(translate('loadTeacherError') || "Failed to load teacher information.");
        setTeacherData(null);
      } finally {
        setLoadingData(false);
      }
    };

    fetchTeacherAndAdminData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, role, isSchoolCodeVerified, translate]);
  

  if (authLoading || (role === 'Teacher' && isSchoolCodeVerified === true && (loadingData || loadingAdminDetails))) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{translate('loadingDashboard') || "Loading dashboard..."}</span>
      </div>
    );
  }

  if (role === 'Teacher' && isSchoolCodeVerified !== true) {
    return (
      <Card className="md:col-span-2 lg:col-span-3 border-destructive bg-destructive/10">
        <CardHeader>
           <CardTitle className="text-destructive">{translate('schoolVerificationNeededTitle') || "School Verification Required"}</CardTitle>
        </CardHeader>
        <CardContent>
           <p className="text-destructive">{translate('schoolVerificationNeededDesc') || "Please verify your school code to access the dashboard."}</p>
            <Button asChild className="mt-4">
                <Link href="/teacher/verify-school">{translate('goToVerificationPage') || "Go to Verification Page"}</Link>
            </Button>
        </CardContent>
     </Card>
    );
  }
  
   if (role === 'Teacher' && error) {
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

   if (role === 'Teacher' && !teacherData) {
     return (
         <Card className="md:col-span-2 lg:col-span-3">
             <CardHeader>
                 <CardTitle>{translate('noTeacherDataTitle') || "No Teacher Data"}</CardTitle>
                 <CardDescription>{translate('noTeacherDataDesc') || "Could not find teacher information. Please ensure your profile is complete or contact support."}</CardDescription>
             </CardHeader>
         </Card>
     );
   }

   if (role === 'Teacher' && teacherData) {
    const assignedClassesCount = teacherData?.assignedClassIds?.length ?? 0;
    const teacherName = teacherData?.name || (user?.displayName || user?.email || translate('teacherFallbackName') || 'Teacher');

    return (
      <div className="grid auto-rows-auto gap-6">
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

            {schoolAdminDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" /> {translate('schoolAdminContactTitle')}</CardTitle>
                  <CardDescription>{translate('schoolAdminContactDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><strong>{translate('schoolNameLabel')}:</strong> {schoolAdminDetails.schoolName || schoolAdminDetails.name || translate('notSetPlaceholder')}</p>
                  <p><strong>{translate('adminEmailLabel')}:</strong> {schoolAdminDetails.email || translate('notSetPlaceholder')}</p>
                  {schoolAdminDetails.phoneNumber ? (
                    <p><strong>{translate('phoneNumberLabel')}:</strong> {schoolAdminDetails.phoneNumber}</p>
                  ) : (
                    <p className="text-muted-foreground">{translate('adminPhoneNumberNotSet')}</p>
                  )}
                </CardContent>
              </Card>
            )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <p>{translate('loadingDashboard') || "Loading..."}</p>
    </div>
  );
}


