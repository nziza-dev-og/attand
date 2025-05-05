import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Activity, Users, School, ClipboardList } from "lucide-react";
import { collection, getCountFromServer, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from 'date-fns';

// Helper function to get counts safely
async function getCollectionCount(collectionName: string, role?: 'Student' | 'Teacher' | 'Parent' | 'Admin'): Promise<number> {
  try {
    let q;
    if (role) {
      // Assuming 'role' field exists in the 'users' collection
       if (collectionName !== 'users') {
           console.warn(`Filtering by role is typically done on the 'users' collection, but requested for '${collectionName}'. Adjust if needed.`);
           // If you have role info duplicated in other collections, this might work, but it's generally better to query 'users'
           q = query(collection(db, collectionName), where("role", "==", role));
       } else {
            q = query(collection(db, collectionName), where("role", "==", role));
       }
    } else {
      q = collection(db, collectionName);
    }
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error(`Error fetching count for ${collectionName}${role ? ` with role ${role}` : ''}:`, error);
    return 0; // Return 0 on error
  }
}

// Helper function to get attendance marked today count
async function getAttendanceMarkedTodayCount(): Promise<number> {
    try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        // Firestore timestamps for start and end of the day
        const startOfDay = Timestamp.fromDate(new Date(todayStr + 'T00:00:00'));
        const endOfDay = Timestamp.fromDate(new Date(todayStr + 'T23:59:59'));

        // Query attendanceRecords marked within today's timestamp range
        // Note: This counts individual records. A percentage might require knowing total expected records.
        const q = query(
            collection(db, "attendanceRecords"),
            where("timestamp", ">=", startOfDay),
            where("timestamp", "<=", endOfDay)
        );
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
        // For percentage: you'd need total students * classes today, which is more complex.
        // Let's stick to the count of records marked today for simplicity.
    } catch (error) {
        console.error("Error fetching attendance marked today:", error);
        return 0;
    }
}


export default async function AdminDashboard() {
  // Fetch data from Firestore
  const totalClasses = await getCollectionCount('classes');
  // Fetch count of users with role 'Student'
  const totalStudents = await getCollectionCount('users', 'Student');
  // Fetch count of users with role 'Teacher'
  const totalTeachers = await getCollectionCount('users', 'Teacher');
   // Get count of attendance records created today
  const attendanceMarkedTodayCount = await getAttendanceMarkedTodayCount();
   // Simple approximation of percentage (assuming ~totalStudents need marking)
   const attendanceMarkedTodayPercentage = totalStudents > 0
     ? Math.round((attendanceMarkedTodayCount / totalStudents) * 100)
     : 0;


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
          <Users className="h-4 w-4 text-muted-foreground" /> {/* Changed icon to Users as Activity might not fit */}
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
           {/* Displaying count instead of percentage for accuracy */}
          <div className="text-2xl font-bold">{attendanceMarkedTodayCount}</div>
          <p className="text-xs text-muted-foreground">Records marked today</p>
           {/* Or show percentage if preferred
           <div className="text-2xl font-bold">{attendanceMarkedTodayPercentage}%</div>
           <p className="text-xs text-muted-foreground">Approximate percentage marked</p>
           */}
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