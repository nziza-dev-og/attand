
// src/app/parent/page.tsx
"use client"; // Use client component for hooks and state

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { User, CalendarDays, BarChart3, Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, collectionGroup, Timestamp } from 'firebase/firestore';
import type { Student, AttendanceRecord, Parent } from '@/lib/types'; // Import types
import { useLanguage } from '@/contexts/LanguageContext'; // Import useLanguage

// Function to get initials from name
const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('') || '??';
};

// Function to calculate attendance percentage (simplified)
const calculateAttendancePercentage = (records: AttendanceRecord[]): number => {
  if (records.length === 0) return 100; 

  const presentOrLateCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const percentage = Math.round((presentOrLateCount / records.length) * 100);
  return percentage;
};

interface ChildWithAttendance extends Student {
    attendancePercentage: number;
}


export default function ParentDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { translate } = useLanguage(); // Initialize useLanguage
    const [childrenData, setChildrenData] = useState<ChildWithAttendance[]>([]);
    const [parentName, setParentName] = useState<string>(translate('parent') || 'Parent');
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user?.displayName) {
            setParentName(user.displayName);
        } else if (user?.email) {
            setParentName(user.email);
        }
    }, [user]);


    useEffect(() => {
        const fetchParentAndChildrenData = async () => {
            if (authLoading || !user) {
                 if (!authLoading && !user) setLoadingData(false);
                return;
            }

            setLoadingData(true);
            setError(null);
            try {
                const parentDocRef = doc(db, 'users', user.uid);
                const parentDocSnap = await getDoc(parentDocRef);

                if (!parentDocSnap.exists() || parentDocSnap.data().role !== 'Parent') {
                    setError(translate('parentProfileError') || "Parent profile not found or user is not a parent.");
                    setLoadingData(false);
                    return;
                }

                const parentData = parentDocSnap.data() as Omit<Parent, 'id'> & { createdAt: Timestamp }; 
                setParentName(parentData.name || user.displayName || user.email || translate('parent') || 'Parent');
                const childIds = parentData.childIds || [];

                if (childIds.length === 0) {
                    setChildrenData([]);
                    setLoadingData(false);
                    return;
                }

                const childrenPromises = childIds.map(async (childId) => {
                    try {
                        const studentDocRef = doc(db, 'users', childId); 
                        const studentDocSnap = await getDoc(studentDocRef);

                         if (!studentDocSnap.exists() || studentDocSnap.data().role !== 'Student') {
                             console.warn(`Child document not found or not a student for ID: ${childId}`);
                             return null; 
                         }

                         const studentData = studentDocSnap.data();
                         const attendanceQuery = query(
                             collection(db, 'attendanceRecords'),
                             where('studentId', '==', childId)
                         );
                         const attendanceSnap = await getDocs(attendanceQuery);
                         const attendanceRecords = attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
                         const attendancePercentage = calculateAttendancePercentage(attendanceRecords);

                         return {
                             id: studentDocSnap.id,
                             name: studentData.name || translate('unknownChild') || 'Unknown Child',
                             parentIds: studentData.parentIds || [],
                             role: 'Student', 
                             createdAt: studentData.createdAt, 
                             avatarUrl: studentData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentData.name || 'U')}&background=random`, 
                             attendancePercentage: attendancePercentage,
                         } as ChildWithAttendance;

                    } catch (childError) {
                         console.error(`Error fetching data for child ${childId}:`, childError);
                         return null; 
                    }
                });

                 const resolvedChildren = (await Promise.all(childrenPromises)).filter(child => child !== null) as ChildWithAttendance[];
                 setChildrenData(resolvedChildren);

            } catch (err) {
                console.error("Error fetching parent/children data:", err);
                setError(translate('dashboardLoadError') || "Failed to load dashboard data.");
            } finally {
                setLoadingData(false);
            }
        };

        fetchParentAndChildrenData();
    }, [user, authLoading, translate]);

     const isLoading = authLoading || loadingData; 

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
          <Card className="border-destructive bg-destructive/10">
             <CardHeader>
                <CardTitle className="text-destructive">{translate('errorTitle') || "Error"}</CardTitle>
             </CardHeader>
             <CardContent>
                <p className="text-destructive">{error}</p>
             </CardContent>
          </Card>
       );
    }


    return (
    <div className="grid gap-6">
       <Card>
           <CardHeader>
               <CardTitle>{translate('welcomeMessage', { name: parentName })}</CardTitle>
               <CardDescription>{translate('parentDashboardDesc') || "Monitor your children's school attendance."}</CardDescription>
           </CardHeader>
           <CardContent>
             {childrenData.length > 0 ? (
                <p>{translate('parentDashboardSelectChild') || "Select a child below to view their detailed attendance records or use the sidebar for general views."}</p>
             ) : (
                <p>{translate('parentDashboardNoChildren') || "No children linked to your account. Please contact the school administration if this is incorrect."}</p>
             )}
           </CardContent>
        </Card>

       {childrenData.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {childrenData.map(child => (
               <Card key={child.id} className="hover:shadow-md transition-shadow">
                 <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <Avatar className="h-12 w-12">
                       <AvatarImage src={child.avatarUrl} alt={child.name} data-ai-hint="child student portrait" />
                       <AvatarFallback>{getInitials(child.name)}</AvatarFallback>
                     </Avatar>
                     <div className="flex-1">
                        <CardTitle className="text-lg">{child.name}</CardTitle>
                         <CardDescription>{translate('childOverallAttendance', { percentage: child.attendancePercentage.toString() })}</CardDescription>
                     </div>
                 </CardHeader>
                 <CardContent className="pt-2">
                     <Link href={`/parent/child/${child.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                       <CalendarDays className="h-4 w-4" /> {translate('viewDetailedAttendanceLink') || "View Detailed Attendance"}
                     </Link>
                 </CardContent>
               </Card>
            ))}
           </div>
        )}

       {childrenData.length > 0 && ( 
        <Card>
           <CardHeader>
             <CardTitle className="text-lg">{translate('parentQuickLinksTitle') || "Quick Links"}</CardTitle>
           </CardHeader>
           <CardContent className="flex flex-col sm:flex-row gap-4">
             <Link href="/parent/attendance" className="flex items-center gap-2 text-primary hover:underline">
               <CalendarDays className="h-5 w-5" /> {translate('viewAllAttendance')}
             </Link>
             <Link href="/parent/summary" className="flex items-center gap-2 text-primary hover:underline">
               <BarChart3 className="h-5 w-5" /> {translate('attendanceSummary')}
             </Link>
           </CardContent>
         </Card>
        )}
    </div>
  );
}
