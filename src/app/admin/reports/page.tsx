// src/app/admin/reports/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, Timestamp, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Loader2, Search, FileDown } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Class, Student, AttendanceRecord, UserProfile } from "@/lib/types"; // Import types

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
      case 'present': return 'default'; // Will use primary bg if styled below
      case 'absent': return 'destructive';
      case 'late': return 'secondary'; // Will use yellow bg if styled below
      default: return 'outline';
    }
};
type AttendanceStatus = 'present' | 'absent' | 'late';


export default function AttendanceReportsPage() {
  const [classes, setClasses] = useState<SelectItemType[]>([]);
  const [students, setStudents] = useState<SelectItemType[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  // Filter state
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Report data state
  const [reportData, setReportData] = useState<AttendanceRecordDisplay[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const { toast } = useToast();

   // Fetch classes and students for dropdowns
  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoadingDropdowns(true);
      try {
        const classSnap = await getDocs(collection(db, "classes"));
        setClasses(classSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));

        const studentQuery = query(collection(db, "users"), where("role", "==", "Student"));
        const studentSnap = await getDocs(studentQuery);
        setStudents(studentSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name || 'Unnamed Student' })));

      } catch (err) {
        console.error("Error fetching dropdown data:", err);
        toast({ variant: "destructive", title: "Error", description: "Failed to load filter options." });
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdownData();
  }, []);

  // Generate Report Function
  const handleGenerateReport = async () => {
    setLoadingReport(true);
    setReportGenerated(false);
    setReportError(null);
    setReportData([]);

    try {
      let attendanceQuery = query(collection(db, "attendanceRecords"), orderBy("timestamp", "desc")); // Base query

      // Apply filters
      if (selectedClass) {
        attendanceQuery = query(attendanceQuery, where("classId", "==", selectedClass));
      }
      if (selectedStudent) {
        attendanceQuery = query(attendanceQuery, where("studentId", "==", selectedStudent));
      }
      if (startDate) {
         // Convert JS Date to Firestore Timestamp for the start of the day
        const startTimestamp = Timestamp.fromDate(startOfDay(startDate));
        attendanceQuery = query(attendanceQuery, where("timestamp", ">=", startTimestamp));
      }
       if (endDate) {
           // Convert JS Date to Firestore Timestamp for the end of the day
           const endTimestamp = Timestamp.fromDate(endOfDay(endDate));
           attendanceQuery = query(attendanceQuery, where("timestamp", "<=", endTimestamp));
       }


      const attendanceSnap = await getDocs(attendanceQuery);
      const records = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));

      // Enrich records with names (consider optimizing this for large datasets)
      const enrichedData: AttendanceRecordDisplay[] = await Promise.all(records.map(async record => {
         // Use cached names if available, otherwise fetch (simple approach)
         const studentName = students.find(s => s.id === record.studentId)?.name || 'Unknown Student';
         const className = classes.find(c => c.id === record.classId)?.name || 'Unknown Class';
         return { ...record, studentName, className };
      }));


      setReportData(enrichedData);
      setReportGenerated(true);

      if (enrichedData.length === 0) {
           toast({ title: "Info", description: "No attendance records found matching the criteria." });
      }

    } catch (err: any) {
      console.error("Error generating report:", err);
      setReportError(`Failed to generate report: ${err.message}`);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate report." });
    } finally {
      setLoadingReport(false);
    }
  };

   // Placeholder for export functionality
  const handleExport = () => {
      toast({ title: "Info", description: "Export functionality not implemented yet." });
      // Logic to convert reportData to CSV/PDF would go here
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Reports</CardTitle>
        <CardDescription>Filter and view attendance records. Export options coming soon.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
          {/* Class Filter */}
          <div className="space-y-1">
            <Label htmlFor="class-filter">Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass} disabled={loadingDropdowns}>
              <SelectTrigger id="class-filter">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="">All Classes</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student Filter */}
          <div className="space-y-1">
             <Label htmlFor="student-filter">Student</Label>
             <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={loadingDropdowns}>
                <SelectTrigger id="student-filter">
                 <SelectValue placeholder="All Students" />
                </SelectTrigger>
                <SelectContent>
                 <SelectItem value="">All Students</SelectItem>
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
                <Button onClick={handleGenerateReport} disabled={loadingReport || loadingDropdowns}>
                    {loadingReport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Search className="mr-2 h-4 w-4" /> Generate Report
                </Button>
            </div>
        </div>

        {/* Report Results Section */}
        {loadingReport && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2">Generating report...</span>
          </div>
        )}
        {reportError && (
          <p className="text-center text-destructive">{reportError}</p>
        )}
         {reportGenerated && !loadingReport && !reportError && (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                     <h3 className="text-lg font-medium">Report Results ({reportData.length} Records)</h3>
                     <Button variant="outline" size="sm" onClick={handleExport} disabled={reportData.length === 0}>
                         <FileDown className="mr-2 h-4 w-4" /> Export
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
                    {reportData.length > 0 ? (
                      reportData.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.date}</TableCell> {/* Or format(record.timestamp.toDate(), 'yyyy-MM-dd') */}
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
                        <TableCell colSpan={4} className="h-24 text-center">
                          No attendance records found matching your criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
           </div>
         )}
          {!reportGenerated && !loadingReport && !reportError && (
               <p className="text-center text-muted-foreground py-10">Select filters and click "Generate Report" to view attendance data.</p>
          )}
      </CardContent>
       {/* Footer potentially for pagination or summary stats */}
       {/* <CardFooter>
           <p>Report Summary Stats Here...</p>
       </CardFooter> */}
    </Card>
  );
}