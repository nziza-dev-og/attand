"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart, XCircle, Clock, CheckCircle, Loader2 } from "lucide-react"; // Use relevant icons
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { AttendanceRecord, Parent } from '@/lib/types';

interface AttendanceSummary {
    overallPercentage: number;
    absences: number;
    lates: number;
    present: number;
    totalRecords: number;
}

export default function AttendanceSummaryPage() {
    const { user, loading: authLoading } = useAuth();
    const [summary, setSummary] = useState<AttendanceSummary | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

     useEffect(() => {
        const fetchAttendanceSummary = async () => {
             if (authLoading || !user) {
                if (!authLoading && !user) setLoadingData(false);
                return;
            }

            setLoadingData(true);
            setError(null);
            try {
                 // 1. Get Parent's Child IDs
                 const parentDocRef = doc(db, 'users', user.uid);
                 const parentDocSnap = await getDoc(parentDocRef);

                 if (!parentDocSnap.exists() || parentDocSnap.data().role !== 'Parent') {
                     setError("Parent profile not found or user is not a parent.");
                     setLoadingData(false);
                     return;
                 }
                 const parentData = parentDocSnap.data() as Parent;
                 const childIds = parentData.childIds || [];

                 if (childIds.length === 0) {
                     // No children, so no summary
                     setSummary({ overallPercentage: 0, absences: 0, lates: 0, present: 0, totalRecords: 0 });
                     setLoadingData(false);
                     return;
                 }

                 // 2. Fetch all attendance records for all children
                 // Using 'in' query (max 30 IDs per query in Firestore v9+, consider multiple queries if more children)
                 // Ensure you have Firestore indexes set up for this query (studentId field).
                 if (childIds.length > 30) {
                     console.warn("Fetching summary for more than 30 children, consider batching queries.");
                     // Implement batching logic here if necessary
                 }

                 const attendanceQuery = query(
                     collection(db, 'attendanceRecords'),
                     where('studentId', 'in', childIds)
                     // Add date range filters if needed (e.g., current school year)
                 );

                 const attendanceSnap = await getDocs(attendanceQuery);
                 const allRecords = attendanceSnap.docs.map(doc => doc.data() as AttendanceRecord);

                 // 3. Calculate Summary Statistics
                 const totalRecords = allRecords.length;
                 let absences = 0;
                 let lates = 0;
                 let present = 0;

                 allRecords.forEach(record => {
                     switch (record.status) {
                         case 'absent':
                             absences++;
                             break;
                         case 'late':
                             lates++;
                             break;
                         case 'present':
                             present++;
                             break;
                     }
                 });

                 const presentOrLateCount = present + lates;
                 const overallPercentage = totalRecords > 0 ? Math.round((presentOrLateCount / totalRecords) * 100) : 0; // Or 100 if preferred for 0 records

                 setSummary({
                     overallPercentage,
                     absences,
                     lates,
                     present,
                     totalRecords,
                 });

            } catch (err: any) {
                 console.error("Error fetching attendance summary:", err);
                 setError(`Failed to load summary: ${err.message}`);
                 setSummary(null);
            } finally {
                setLoadingData(false);
            }
        };

        fetchAttendanceSummary();
    }, [user, authLoading]);

      if (loadingData || authLoading) {
        return (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading summary...</span>
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

     if (!summary) {
         return (
             <Card>
                 <CardHeader>
                     <CardTitle>Attendance Summary</CardTitle>
                     <CardDescription>Overall attendance statistics for your children.</CardDescription>
                 </CardHeader>
                 <CardContent>
                     <p className="text-muted-foreground">Could not load summary data.</p>
                 </CardContent>
             </Card>
         );
     }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Summary</CardTitle>
        <CardDescription>Overall attendance statistics for your children ({summary.totalRecords} total records found).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
             {/* Overall Percentage */}
            <Card className="bg-primary/10 border-primary">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium text-primary">Overall Attendance</CardTitle>
                     <BarChart className="h-4 w-4 text-primary/70" />
                 </CardHeader>
                 <CardContent>
                     <div className="text-2xl font-bold text-primary">{summary.overallPercentage}%</div>
                     <p className="text-xs text-primary/80">Based on recorded days</p>
                 </CardContent>
            </Card>
             {/* Absences */}
             <Card className="bg-destructive/10 border-destructive">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium text-destructive">Total Absences</CardTitle>
                     <XCircle className="h-4 w-4 text-destructive/70" />
                 </CardHeader>
                 <CardContent>
                     <div className="text-2xl font-bold text-destructive">{summary.absences}</div>
                     <p className="text-xs text-destructive/80">Days marked absent</p>
                 </CardContent>
            </Card>
             {/* Lates */}
             <Card className="bg-yellow-500/10 border-yellow-500">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium text-yellow-700">Total Lates</CardTitle>
                     <Clock className="h-4 w-4 text-yellow-700/70" />
                 </CardHeader>
                 <CardContent>
                     <div className="text-2xl font-bold text-yellow-700">{summary.lates}</div>
                     <p className="text-xs text-yellow-700/80">Days marked late</p>
                 </CardContent>
            </Card>
             {/* Present */}
             <Card className="bg-green-600/10 border-green-600">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium text-green-700">Total Present</CardTitle>
                      <CheckCircle className="h-4 w-4 text-green-700/70" />
                 </CardHeader>
                 <CardContent>
                     <div className="text-2xl font-bold text-green-700">{summary.present}</div>
                     <p className="text-xs text-green-700/80">Days marked present</p>
                 </CardContent>
            </Card>
        </div>

         {summary.totalRecords === 0 && (
             <p className="text-center text-muted-foreground pt-4">No attendance records found for your children yet.</p>
         )}

         {/* Placeholder for future charts */}
         {summary.totalRecords > 0 && (
           <p className="pt-4 text-muted-foreground">Further charts and statistics (e.g., trends, per child comparison) can be added here.</p>
         )}


      </CardContent>
    </Card>
  );
}