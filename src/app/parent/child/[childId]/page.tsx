"use client";

import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, type Timestamp } from 'firebase/firestore'; // Added Timestamp type
import type { Student, AttendanceRecord, AttendanceStatus } from '@/lib/types'; // Combined types
import { Loader2 } from 'lucide-react';


// Helper function to get badge variant based on status
const getBadgeVariant = (status: AttendanceStatus): 'default' | 'destructive' | 'secondary' | 'outline' => {
  switch (status) {
    case 'present': return 'default'; // Will use primary bg if styled below
    case 'absent': return 'destructive';
    case 'late': return 'secondary'; // Will use yellow bg if styled below
    default: return 'outline';
  }
};

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('') || '??';
};

interface ChildInfo extends Student {
    // No additional fields needed from Student type directly for display here
    // avatarUrl is optional in Student type
}

interface AttendanceRecordWithId extends AttendanceRecord {
    id: string; // Ensure ID is present after fetching
    // date is string 'YYYY-MM-DD' in AttendanceRecord type
}


export default function ChildAttendancePage() {
  const params = useParams();
  const childId = params.childId as string;

  const [childInfo, setChildInfo] = useState<ChildInfo | null>(null);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecordWithId[]>([]); // Store all fetched records
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined); // For calendar filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!childId) {
        setError("Child ID is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fetch Child Info
        const studentDocRef = doc(db, 'users', childId); // Assuming students are in 'users' collection
        const studentDocSnap = await getDoc(studentDocRef);

        if (studentDocSnap.exists() && studentDocSnap.data().role === 'Student') {
          const data = studentDocSnap.data();
           setChildInfo({
             id: studentDocSnap.id,
             name: data.name || 'Unknown Child',
             email: data.email, // Include fields as needed from Student type
             role: 'Student', // From the check above
             parentIds: data.parentIds || [],
             classIds: data.classIds || [],
             createdAt: data.createdAt as Timestamp, // Cast Firestore Timestamp from UserProfile part
             // Use a fallback avatar if none is set
             avatarUrl: data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'U')}&background=random`,
             // Include other Student fields if necessary
           } as ChildInfo); // Ensure type compatibility

        } else {
           if (studentDocSnap.exists()) {
               setError("User found but is not registered as a Student.");
           } else {
               setError("Student profile not found.");
           }
           setChildInfo(null);
           setLoading(false);
           return; // Stop if child info not found
        }

        // Fetch Attendance Records
         // Assuming 'attendanceRecords' is a top-level collection
        const attendanceQuery = query(
          collection(db, 'attendanceRecords'),
          where('studentId', '==', childId),
          orderBy('date', 'desc') // Order by date descending
        );
        const attendanceSnap = await getDocs(attendanceQuery);
        const records = attendanceSnap.docs.map(doc => ({
             id: doc.id,
             ...doc.data()
        } as AttendanceRecordWithId)); // Ensure ID and type

        setAllAttendanceRecords(records);

      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(`Failed to load data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [childId]);

   // Filter records based on selectedDate
   const filteredRecords = selectedDate
     ? allAttendanceRecords.filter(record => record.date === format(selectedDate, 'yyyy-MM-dd'))
     : allAttendanceRecords; // Show all if no date selected


  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="ml-3 text-lg">Loading attendance data...</span>
        </div>
    );
  }

   if (error) {
     return (
       <Card className="lg:col-span-3 border-destructive bg-destructive/10">
         <CardHeader>
           <CardTitle className="text-destructive">Error</CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-destructive">{error}</p>
         </CardContent>
       </Card>
     );
   }

  if (!childInfo) {
     // This case might be covered by error state, but good as a fallback
    return <p>Child information could not be loaded.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
       {/* Child Info and Calendar */}
        <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <Avatar className="h-16 w-16">
                   <AvatarImage src={childInfo.avatarUrl} alt={childInfo.name} data-ai-hint="child student portrait"/>
                   <AvatarFallback>{getInitials(childInfo.name)}</AvatarFallback>
                 </Avatar>
                 <div>
                    <CardTitle className="text-xl">{childInfo.name}</CardTitle>
                     <CardDescription>Viewing attendance records</CardDescription>
                 </div>
              </CardHeader>
            </Card>

            <Card>
                 <CardHeader>
                     <CardTitle className="text-lg">Filter by Date</CardTitle>
                     <CardDescription>Select a date to view attendance for that day.</CardDescription>
                 </CardHeader>
                 <CardContent className="flex justify-center">
                     <Calendar
                         mode="single"
                         selected={selectedDate}
                         onSelect={setSelectedDate}
                         className="rounded-md border"
                     />
                 </CardContent>
            </Card>
        </div>


       {/* Attendance Table */}
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Records {selectedDate ? `for ${format(selectedDate, 'PPP')}` : '(All Time)'}</CardTitle>
                    <CardDescription>List of attendance statuses recorded for {childInfo.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Class</TableHead>{/* Assuming className is stored */}
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {filteredRecords.length > 0 ? (
                                filteredRecords.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell>{record.date}</TableCell>
                                    {/* Display Class Name - Requires fetching class details or storing className in record */}
                                     <TableCell>{record.classId.substring(0,8)}...</TableCell>{/* Placeholder - show Class ID for now */}
                                     {/* TODO: Fetch class name based on record.classId if needed, or ensure it's stored in the record */}
                                    <TableCell className="text-right">
                                    <Badge variant={getBadgeVariant(record.status)}
                                      className={cn(
                                        'capitalize', // Ensure consistent capitalization display
                                        record.status === 'present' ? 'bg-green-600 text-white hover:bg-green-700' : '',
                                        record.status === 'late' ? 'bg-yellow-500 text-white hover:bg-yellow-600' : '',
                                        record.status === 'absent' ? '' : '' // destructive variant handles styling
                                      )}
                                    >
                                        {record.status}
                                    </Badge>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                    {selectedDate ? 'No records found for this date.' : 'No attendance records found for this child.'}
                                    </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
