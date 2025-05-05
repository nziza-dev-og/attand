import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardCheck, History, Bell } from "lucide-react";

export default function TeacherDashboard() {
  // In a real app, fetch teacher-specific data like assigned classes, upcoming schedules, notifications
  const assignedClassesCount = 5;
  const needsAttendanceToday = true; // Example flag

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
       <Card className="md:col-span-2 lg:col-span-3">
           <CardHeader>
               <CardTitle>Welcome, Teacher!</CardTitle>
               <CardDescription>Your dashboard for managing class attendance.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
               <p>You are assigned to <span className="font-semibold">{assignedClassesCount}</span> classes.</p>
               {needsAttendanceToday && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800">
                       <Bell className="h-5 w-5" />
                       <span>Remember to mark attendance for your classes today.</span>
                   </div>
               )}
               <div className="flex gap-4">
                  <Button asChild>
                     <Link href="/teacher/mark-attendance">
                       <ClipboardCheck className="mr-2 h-4 w-4" /> Mark Attendance
                     </Link>
                  </Button>
                   <Button variant="outline" asChild>
                     <Link href="/teacher/history">
                        <History className="mr-2 h-4 w-4" /> View History
                     </Link>
                   </Button>
               </div>
           </CardContent>
        </Card>

        {/* Placeholder for additional widgets like upcoming schedule or recent activity */}
         <Card>
           <CardHeader>
             <CardTitle className="text-lg">Quick Links</CardTitle>
           </CardHeader>
           <CardContent className="flex flex-col gap-2">
             <Link href="/teacher/mark-attendance" className="text-primary hover:underline">Mark Today's Attendance</Link>
             <Link href="/teacher/history" className="text-primary hover:underline">View Past Records</Link>
             {/* Add link to view assigned classes if needed */}
           </CardContent>
         </Card>
    </div>
  );
}
