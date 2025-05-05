import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { User, CalendarDays, BarChart3 } from "lucide-react";

// Mock data - Replace with actual data fetching for the logged-in parent's children
const mockChildren = [
    { id: 'child1', name: 'Alice Smith', avatarUrl: 'https://picsum.photos/100/100?random=1', attendancePercentage: 95 },
    { id: 'child2', name: 'Charlie Brown', avatarUrl: 'https://picsum.photos/100/100?random=2', attendancePercentage: 88 },
];

// Function to get initials from name
const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('');
};


export default function ParentDashboard() {
  return (
    <div className="grid gap-6">
       <Card>
           <CardHeader>
               <CardTitle>Welcome, Parent!</CardTitle>
               <CardDescription>Monitor your children's school attendance.</CardDescription>
           </CardHeader>
           <CardContent>
               <p>Select a child below to view their detailed attendance records or use the sidebar for general views.</p>
           </CardContent>
        </Card>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockChildren.map(child => (
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

       {/* Quick Links Card */}
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
    </div>
  );
}
