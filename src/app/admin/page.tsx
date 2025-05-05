import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Activity, Users, School, ClipboardList } from "lucide-react";

export default function AdminDashboard() {
  // In a real app, fetch these numbers from Firestore
  const totalClasses = 15;
  const totalStudents = 350;
  const totalTeachers = 25;
  const attendanceMarkedToday = 85; // Percentage or count

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
          <School className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalClasses}</div>
          <p className="text-xs text-muted-foreground">Managed classes</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStudents}</div>
          <p className="text-xs text-muted-foreground">Enrolled students</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTeachers}</div>
          <p className="text-xs text-muted-foreground">Registered teachers</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attendance Today</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{attendanceMarkedToday}%</div>
          <p className="text-xs text-muted-foreground">Approximate percentage marked</p>
        </CardContent>
      </Card>

       {/* Placeholder for more dashboard components */}
        <Card className="md:col-span-2 lg:col-span-4">
           <CardHeader>
               <CardTitle>Welcome, Admin!</CardTitle>
               <CardDescription>Use the sidebar to manage classes, students, teachers, parents, assignments, and view reports.</CardDescription>
           </CardHeader>
           <CardContent>
               <p>This is your central hub for managing AttendEase.</p>
               {/* Add more specific instructions or quick links here */}
           </CardContent>
        </Card>
    </div>
  );
}
