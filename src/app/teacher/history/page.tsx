import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Mock data - Replace with actual data fetching
const mockHistory = [
  { id: 'rec1', date: '2024-05-20', studentName: 'Alice Smith', className: 'Mathematics - Grade 10A', status: 'present' },
  { id: 'rec2', date: '2024-05-20', studentName: 'Bob Johnson', className: 'Mathematics - Grade 10A', status: 'absent' },
  { id: 'rec3', date: '2024-05-19', studentName: 'Alice Smith', className: 'Mathematics - Grade 10A', status: 'late' },
  { id: 'rec4', date: '2024-05-19', studentName: 'Charlie Brown', className: 'Mathematics - Grade 10A', status: 'present' },
   { id: 'rec5', date: '2024-05-20', studentName: 'David Williams', className: 'Physics - Grade 11B', status: 'present' },
];

const getBadgeVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
  switch (status) {
    case 'present': return 'default'; // Use primary color (Teal in this theme)
    case 'absent': return 'destructive';
    case 'late': return 'secondary'; // Use secondary for Late (or choose another distinct style)
    default: return 'outline';
  }
};


export default function AttendanceHistoryPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance History</CardTitle>
        <CardDescription>Review past attendance records for your classes.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Add filters for class, date range, student etc. here */}
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
               {mockHistory.length > 0 ? (
                 mockHistory.map((record) => (
                   <TableRow key={record.id}>
                     <TableCell>{record.date}</TableCell>
                     <TableCell>{record.studentName}</TableCell>
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
                   <TableCell colSpan={4} className="text-center text-muted-foreground">No attendance records found.</TableCell>
                 </TableRow>
               )}
             </TableBody>
           </Table>
         </div>
      </CardContent>
    </Card>
  );
}

// Helper function to handle className merging (already exists in utils)
import { cn } from '@/lib/utils';
