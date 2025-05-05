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

// Function to get initials from name
const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('') || '??';
};

// Function to calculate attendance percentage (simplified)
// Note: A more accurate calculation might need total school days in the period.
const calculateAttendancePercentage = (records: AttendanceRecord[]): number => {
  if (records.length === 0) return 100; // Assume 100% if no records yet? Or 0? Needs clarification. Let's assume 100 for now.

  const presentOrLateCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const percentage = Math.round((presentOrLateCount / records.length) * 100);
  return percentage;
};

interface ChildWithAttendance extends Student {
    attendancePercentage: number;
    // We might add more summary data later, like total absences, lates etc.
    // avatarUrl?: string; // Already part of Student type
}


export default function ParentDashboard() {
    const { user, loading: authLoading } = useAuth();
    const [childrenData, setChildrenData] = useState<ChildWithAttendance[]>([]);
    const [parentName, setParentName] = useState<string>('Parent');
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchParentAndChildrenData = async () => {
            if (authLoading || !user) {
                 if (!authLoading && !user) setLoadingData(false);
                return;
            }

            setLoadingData(true);
            setError(null);
            try {
                // 1. Fetch Parent's data to get name and childIds
                const parentDocRef = doc(db, 'users', user.uid);
                const parentDocSnap = await getDoc(parentDocRef);

                if (!parentDocSnap.exists() || parentDocSnap.data().role !== 'Parent') {
                    setError("Parent profile not found or user is not a parent.");
                    setLoadingData(false);
                    return;
                }

                const parentData = parentDocSnap.data() as Omit<Parent, 'id'> & { createdAt: Timestamp }; // Assuming structure from useAuth
                setParentName(parentData.name || 'Parent');
                const childIds = parentData.childIds || [];

                if (childIds.length === 0) {
                    // Parent has no linked children
                    setChildrenData([]);
                    setLoadingData(false);
                    return;
                }

                 // 2. Fetch data for each child
                const childrenPromises = childIds.map(async (childId) => {
                    try {
                        const studentDocRef = doc(db, 'users', childId); // Assuming students are also in 'users'
                        const studentDocSnap = await getDoc(studentDocRef);

                         if (!studentDocSnap.exists() || studentDocSnap.data().role !== 'Student') {
                             console.warn(`Child document not found or not a student for ID: ${childId}`);
                             return null; // Skip this child if not found or not a student
                         }

                         const studentData = studentDocSnap.data();

                         // 3. Fetch Attendance Records for this child
                         // Use collectionGroup for potentially better performance if attendance is deeply nested,
                         // or collection() if it's a top-level collection. Assuming top-level 'attendanceRecords'.
                         const attendanceQuery = query(
                             collection(db, 'attendanceRecords'),
                             where('studentId', '==', childId)
                             // Add date range filters if needed (e.g., this school year)
                         );
                         const attendanceSnap = await getDocs(attendanceQuery);
                         const attendanceRecords = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));

                         const attendancePercentage = calculateAttendancePercentage(attendanceRecords);

                         return {
                             id: studentDocSnap.id,
                             name: studentData.name || 'Unknown Child',
                             // email: studentData.email, // Maybe not needed on dashboard
                             // classIds: studentData.classIds || [],
                             parentIds: studentData.parentIds || [],
                             avatarUrl: studentData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentData.name || 'U')}&background=random`, // Fallback avatar
                             attendancePercentage: attendancePercentage,
                         } as ChildWithAttendance;

                    } catch (childError) {
                         console.error(`Error fetching data for child ${childId}:`, childError);
                         return null; // Return null if there's an error fetching a specific child
                    }
                });

                 const resolvedChildren = (await Promise.all(childrenPromises)).filter(child => child !== null) as ChildWithAttendance[];
                 setChildrenData(resolvedChildren);

            } catch (err) {
                console.error("Error fetching parent/children data:", err);
                setError("Failed to load dashboard data.");
            } finally {
                setLoadingData(false);
            }
        };

        fetchParentAndChildrenData();
    }, [user, authLoading]);

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
          <Card className="border-destructive bg-destructive/10">
             <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
             </CardHeader>
             <CardContent>
                <p className="text-destructive">{error}</p>
             </CardContent>
          </Card>
       );
    }

     const isLoading = authLoading || loadingData;


    return (
    <div className="grid gap-6">
       <Card>
           <CardHeader>
               <CardTitle>Welcome, {parentName}!</CardTitle>
               <CardDescription>Monitor your children's school attendance.</CardDescription>
           </CardHeader>
           <CardContent>
             {childrenData.length > 0 ? (
                <p>Select a child below to view their detailed attendance records or use the sidebar for general views.</p>
             ) : (
                <p>No children linked to your account. Please contact the school administration if this is incorrect.</p>
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
                         <CardDescription>Overall Attendance: {child.attendancePercentage}%</CardDescription>
                     </div>
                 </CardHeader>
                 <CardContent className="pt-2">
                     <Link href={`/parent/child/${child.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                       <CalendarDays className="h-4 w-4" /> View Detailed Attendance
                     </Link>
                 </CardContent>
               </Card>
            ))}
           </div>
        )}

       {/* Quick Links Card */}
       {childrenData.length > 0 && ( // Only show quick links if there are children
        <Card>
           <CardHeader>
             <CardTitle className="text-lg">Quick Links</CardTitle>
           </CardHeader>
           <CardContent className="flex flex-col sm:flex-row gap-4">
             <Link href="/parent/attendance" className="flex items-center gap-2 text-primary hover:underline">
               <CalendarDays className="h-5 w-5" /> View All Attendance
             </Link>
             <Link href="/parent/summary" className="flex items-center gap-2 text-primary hover:underline">
               <BarChart3 className="h-5 w-5" /> View Attendance Summary
             </Link>
           </CardContent>
         </Card>
        )}
    </div>
  );
}