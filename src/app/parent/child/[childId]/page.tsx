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

// Mock data - Replace with actual data fetching based on childId
const mockChildrenData = {
    child1: { name: 'Alice Smith', avatarUrl: 'https://picsum.photos/100/100?random=1' },
    child2: { name: 'Charlie Brown', avatarUrl: 'https://picsum.photos/100/100?random=2' },
};

const mockAttendanceData = {
    child1: [
        { id: 'att1', date: '2024-05-20', className: 'Mathematics - Grade 10A', status: 'present' },
        { id: 'att2', date: '2024-05-20', className: 'Physics - Grade 10A', status: 'present' },
        { id: 'att3', date: '2024-05-19', className: 'Mathematics - Grade 10A', status: 'late' },
         { id: 'att4', date: '2024-05-18', className: 'History - Grade 10A', status: 'absent' },
    ],
    child2: [
        { id: 'att5', date: '2024-05-20', className: 'English - Grade 9C', status: 'present' },
        { id: 'att6', date: '2024-05-19', className: 'Science - Grade 9C', status: 'present' },
         { id: 'att7', date: '2024-05-19', className: 'Art - Grade 9C', status: 'absent' },
    ],
};


const getBadgeVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
  switch (status) {
    case 'present': return 'default';
    case 'absent': return 'destructive';
    case 'late': return 'secondary';
    default: return 'outline';
  }
};

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('');
};

export default function ChildAttendancePage() {
  const params = useParams();
  const childId = params.childId as string;

  const [childInfo, setChildInfo] = useState<{name: string; avatarUrl: string} | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Array<{id: string; date: string; className: string; status: string}>>([]);
   const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined); // For calendar filtering

  useEffect(() => {
    // Simulate fetching data based on childId
    if (childId) {
      const info = mockChildrenData[childId as keyof typeof mockChildrenData];
      const records = mockAttendanceData[childId as keyof typeof mockAttendanceData] || [];
      setChildInfo(info);
       // Sort records by date descending initially
       setAttendanceRecords(records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  }, [childId]);

   // Filter records based on selectedDate
   const filteredRecords = selectedDate
     ? attendanceRecords.filter(record => record.date === format(selectedDate, 'yyyy-MM-dd'))
     : attendanceRecords;


  if (!childInfo) {
    return <p>Loading child information...</p>; // Or a proper loading skeleton
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
                    <CardTitle>Attendance Records {selectedDate ? `for ${format(selectedDate, 'PPP')}` : '(All)'}</CardTitle>
                    <CardDescription>List of attendance statuses recorded.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {filteredRecords.length > 0 ? (
                                filteredRecords.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell>{record.date}</TableCell>
                                    <TableCell>{record.className}</TableCell>
                                    <TableCell className="text-right">
                                    <Badge variant={getBadgeVariant(record.status)}
                                      className={cn(
                                        record.status === 'present' ? 'bg-green-600 text-white' : '',
                                        record.status === 'late' ? 'bg-yellow-500 text-white' : ''
                                      )}
                                    >
                                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
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
