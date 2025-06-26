
// src/app/teacher/history/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2, Search, FileDown } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Papa from 'papaparse'; // For potential export
import type { Class, Student, AttendanceRecord, Teacher, AttendanceStatus } from "@/lib/types";

// Extended type for display including names
interface AttendanceRecordDisplay extends AttendanceRecord {
  studentName: string;
  className: string;
}

// Fetchable item types
type SelectItemType = { id: string; name: string; };

// Helper function to get badge variant based on status
const getBadgeVariant = (status: AttendanceStatus): 'default' | 'destructive' | 'secondary' | 'outline' => {
  switch (status) {
    case 'present': return 'default';
    case 'absent': return 'destructive';
    case 'late': return 'secondary';
    default: return 'outline';
  }
};


export default function AttendanceHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [teacherClasses, setTeacherClasses] = useState<SelectItemType[]>([]);
  const [students, setStudents] = useState<SelectItemType[]>([]); // All students in teacher's classes
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  // Filter state
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Report data state
  const [historyData, setHistoryData] = useState<AttendanceRecordDisplay[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyGenerated, setHistoryGenerated] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const { toast } = useToast();

  // Fetch teacher's classes and all students within those classes
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user || authLoading) return;

      setLoadingDropdowns(true);
      try {
        const teacherDocRef = doc(db, 'users', user.uid);
        const teacherDocSnap = await getDoc(teacherDocRef);
        
        if (!teacherDocSnap.exists() || teacherDocSnap.data().role !== 'Teacher') {
            throw new Error("Teacher profile not found or invalid role.");
        }

        const assignedClassIds = teacherDocSnap.data().assignedClassIds || [];
        if (!Array.isArray(assignedClassIds) || assignedClassIds.length === 0) {
            setTeacherClasses([]);
            setStudents([]);
            toast({ variant: "destructive", title: "No Classes", description: "You are not assigned to any classes." });
            setLoadingDropdowns(false);
            return;
        }

        // Batch fetch Class Details
        const classPromises = [];
        for (let i = 0; i < assignedClassIds.length; i += 30) {
            const batchIds = assignedClassIds.slice(i, i + 30);
            const classesQuery = query(collection(db, 'classes'), where('__name__', 'in', batchIds));
            classPromises.push(getDocs(classesQuery));
        }
        const classSnapshots = await Promise.all(classPromises);
        const classes: SelectItemType[] = [];
        const allStudentIds: string[] = [];
        classSnapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                classes.push({ id: doc.id, name: doc.data().name } as SelectItemType);
                allStudentIds.push(...(doc.data().studentIds || []));
            });
        });
        setTeacherClasses(classes);

        // Fetch All Students in those Classes
        const uniqueStudentIds = [...new Set(allStudentIds)];
        if (uniqueStudentIds.length > 0) {
            const studentPromises = [];
            for (let i = 0; i < uniqueStudentIds.length; i += 30) {
                const batchIds = uniqueStudentIds.slice(i, i + 30);
                const studentsQuery = query(collection(db, 'users'), where('__name__', 'in', batchIds), where('role', '==', 'Student'));
                studentPromises.push(getDocs(studentsQuery));
            }
            const studentSnapshots = await Promise.all(studentPromises);
            const studentList: SelectItemType[] = [];
            studentSnapshots.forEach(snapshot => {
                snapshot.docs.forEach(doc => {
                    studentList.push({ id: doc.id, name: doc.data().name || 'Unnamed Student' } as SelectItemType);
                });
            });
            setStudents(studentList);
        } else {
            setStudents([]);
        }

      } catch (err: any) {
        console.error("Error fetching initial data:", err);
        toast({ variant: "destructive", title: "Error", description: `Failed to load initial data: ${err.message}` });
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchInitialData();
  }, [user, authLoading, toast]);


  // Generate History Function
  const handleGenerateHistory = async () => {
    if (!user) return; // Should not happen if auth is checked

    setLoadingHistory(true);
    setHistoryGenerated(false);
    setHistoryError(null);
    setHistoryData([]);

    try {
        // Start with base query for records marked by this teacher
        let qConstraints = [
          where("markedBy", "==", user.uid),
        ];

        // Apply filters
        if (selectedClass && selectedClass !== 'all') {
            qConstraints.push(where("classId", "==", selectedClass));
        }
        if (selectedStudent && selectedStudent !== 'all') {
            qConstraints.push(where("studentId", "==", selectedStudent));
        }
        if (startDate) {
            qConstraints.push(where("timestamp", ">=", Timestamp.fromDate(startOfDay(startDate))));
        }
        if (endDate) {
            qConstraints.push(where("timestamp", "<=", Timestamp.fromDate(endOfDay(endDate))));
        }

        const attendanceQuery = query(
            collection(db, "attendanceRecords"),
            ...qConstraints,
            orderBy("timestamp", "desc") // Order by most recent first
        );

        const attendanceSnap = await getDocs(attendanceQuery);
        const records = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));

        // Enrich records with names (using already fetched data)
        const studentMap = new Map(students.map(s => [s.id, s.name]));
        const classMap = new Map(teacherClasses.map(c => [c.id, c.name]));

        const enrichedData: AttendanceRecordDisplay[] = records.map(record => {
           const studentName = studentMap.get(record.studentId) || 'Unknown Student';
           const className = classMap.get(record.classId) || 'Unknown Class';
           return { ...record, studentName, className };
        });

        setHistoryData(enrichedData);
        setHistoryGenerated(true);

        if (enrichedData.length === 0) {
            toast({ title: "Info", description: "No attendance records found matching the criteria." });
        }

    } catch (err: any) {
        console.error("Error generating history:", err);
        setHistoryError(`Failed to generate history: ${err.message}`);
        toast({ variant: "destructive", title: "Error", description: "Failed to generate history." });
    } finally {
        setLoadingHistory(false);
    }
};

   // Placeholder for export functionality (similar to admin reports)
   const handleExport = () => {
       if (!historyData || historyData.length === 0) {
           toast({ variant: "destructive", title: "No Data", description: "Generate history first before exporting." });
           return;
       }
       try {
           const csvData = historyData.map(record => ({
               Date: record.timestamp ? format(record.timestamp.toDate(), 'yyyy-MM-dd') : record.date,
               'Student Name': record.studentName,
               'Class Name': record.className,
               Status: record.status,
               Notes: record.notes || '',
           }));
           const csv = Papa.unparse(csvData);
           const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
           const link = document.createElement('a');
           const url = URL.createObjectURL(blob);
           link.setAttribute('href', url);
           const dateSuffix = format(new Date(), 'yyyyMMdd_HHmmss');
           link.setAttribute('download', `attendance_history_${dateSuffix}.csv`);
           link.style.visibility = 'hidden';
           document.body.appendChild(link);
           link.click();
           document.body.removeChild(link);
           toast({ title: "Success", description: "History exported successfully." });
       } catch (error) {
           console.error("Error exporting history:", error);
           toast({ variant: "destructive", title: "Export Failed", description: "Could not export the history." });
       }
   };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance History</CardTitle>
        <CardDescription>Filter and review past attendance records you've submitted.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         {/* Filter Section */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
             {/* Class Filter */}
             <div className="space-y-1">
               <Label htmlFor="class-filter">Class</Label>
               <Select value={selectedClass} onValueChange={setSelectedClass} disabled={loadingDropdowns || teacherClasses.length === 0}>
                 <SelectTrigger id="class-filter">
                   <SelectValue placeholder="Select a Class" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All My Classes</SelectItem>
                   {teacherClasses.map(cls => (
                     <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

             {/* Student Filter */}
             <div className="space-y-1">
                <Label htmlFor="student-filter">Student</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={loadingDropdowns || students.length === 0}>
                   <SelectTrigger id="student-filter">
                    <SelectValue placeholder="Select a Student" />
                   </SelectTrigger>
                   <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {students.map(stu => (
                      <SelectItem key={stu.id} value={stu.id}>{stu.name}</SelectItem>
                    ))}
                   </SelectContent>
                </Select>
              </div>

             {/* Start Date Filter */}
             <div className="space-y-1">
                 <Label htmlFor="start-date-picker">Start Date</Label>
                 <Popover>
                     <PopoverTrigger asChild>
                         <Button
                             id="start-date-picker"
                             variant={"outline"}
                             className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                         >
                             <CalendarIcon className="mr-2 h-4 w-4" />
                             {startDate ? format(startDate, "PPP") : <span>Pick start date</span>}
                         </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0">
                         <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                     </PopoverContent>
                 </Popover>
             </div>

              {/* End Date Filter */}
              <div className="space-y-1">
                  <Label htmlFor="end-date-picker">End Date</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button
                              id="end-date-picker"
                              variant={"outline"}
                              className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                          >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "PPP") : <span>Pick end date</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                      </PopoverContent>
                  </Popover>
              </div>

              {/* Generate Button */}
               <div className="col-span-full flex justify-end mt-2">
                   <Button onClick={handleGenerateHistory} disabled={loadingHistory || loadingDropdowns || authLoading || teacherClasses.length === 0}>
                       {loadingHistory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                       <Search className="mr-2 h-4 w-4" /> View History
                   </Button>
               </div>
           </div>


         {/* History Results Section */}
         {loadingHistory && (
           <div className="flex justify-center items-center py-10">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             <span className="ml-2">Loading history...</span>
           </div>
         )}
         {historyError && (
           <p className="text-center text-destructive">{historyError}</p>
         )}
          {historyGenerated && !loadingHistory && !historyError && (
             <div className="space-y-4">
                 <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">History Results ({historyData.length} Records)</h3>
                      <Button variant="outline" size="sm" onClick={handleExport} disabled={historyData.length === 0}>
                          <FileDown className="mr-2 h-4 w-4" /> Export CSV
                      </Button>
                 </div>
                <div className="border rounded-md">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Date</TableHead>
                       <TableHead>Student</TableHead>
                       <TableHead>Class</TableHead>
                       <TableHead className="text-right">Status</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {historyData.length > 0 ? (
                       historyData.map((record) => (
                         <TableRow key={record.id}>
                           <TableCell>{record.timestamp ? format(record.timestamp.toDate(), 'yyyy-MM-dd') : record.date}</TableCell>
                           <TableCell>{record.studentName}</TableCell>
                           <TableCell>{record.className}</TableCell>
                           <TableCell className="text-right">
                             <Badge variant={getBadgeVariant(record.status)}
                               className={cn(
                                 'capitalize',
                                 record.status === 'present' ? 'bg-green-600 text-white hover:bg-green-700' : '',
                                 record.status === 'late' ? 'bg-yellow-500 text-white hover:bg-yellow-600' : '',
                                 record.status === 'absent' ? '' : ''
                               )}
                             >
                               {record.status}
                             </Badge>
                           </TableCell>
                         </TableRow>
                       ))
                     ) : (
                       <TableRow>
                         <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                           No attendance records found matching your criteria.
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </div>
            </div>
          )}
           {!historyGenerated && !loadingHistory && !historyError && teacherClasses.length > 0 && (
                <p className="text-center text-muted-foreground py-10">Select filters and click "View History" to see attendance data.</p>
           )}
            {!loadingDropdowns && teacherClasses.length === 0 && !authLoading && (
                <p className="text-center text-destructive py-10">You are not assigned to any classes. Cannot view history.</p>
           )}
      </CardContent>
    </Card>
  );
}
