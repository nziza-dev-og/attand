// src/app/admin/teachers/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpenCheck } from "lucide-react"; // Using BookOpenCheck for assignments
import type { Teacher, UserProfile } from "@/lib/types"; // Import Teacher type

// Display type combining UserProfile and Teacher specifics
interface TeacherDisplay extends Omit<UserProfile, 'role'>, Omit<Teacher, 'id' | 'email' | 'name'>{
    id: string;
    role: 'Teacher';
    // Inherits assignedClassIds? from Teacher
}


export default function ManageTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch teachers from Firestore (users with role 'Teacher')
  const fetchTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "users"), where("role", "==", "Teacher"));
      const querySnapshot = await getDocs(q);
      const teacherList = querySnapshot.docs.map(doc => {
         const data = doc.data();
         return {
             id: doc.id,
             uid: doc.id, // Assuming uid is the doc id
             name: data.name || 'Unnamed Teacher',
             email: data.email,
             role: 'Teacher',
             assignedClassIds: data.assignedClassIds || [],
             createdAt: data.createdAt as Timestamp, // Cast Firestore Timestamp
         } as TeacherDisplay;
      });
      setTeachers(teacherList);
    } catch (err: any) {
      console.error("Error fetching teachers:", err);
      setError("Failed to load teachers. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Failed to load teachers." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []); // Fetch on component mount

  // Placeholder function for handling class assignments
  const handleAssignClasses = (teacherId: string) => {
    console.log("Initiate assignment for teacher:", teacherId);
    // TODO: Implement assignment logic (e.g., open a dialog to select classes)
    toast({ title: "Info", description: "Class assignment functionality not yet implemented." });
     // Potentially navigate to a dedicated assignment page: router.push(`/admin/assignments?teacherId=${teacherId}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
         <div>
            <CardTitle>Manage Teachers</CardTitle>
            <CardDescription>View teacher accounts and manage their class assignments.</CardDescription>
        </div>
         {/* Optional: Add Teacher button if admins manually create teacher accounts */}
         {/* <Button size="sm" disabled>Add Teacher</Button> */}
      </CardHeader>
      <CardContent>
        {loading ? (
           <div className="flex justify-center items-center py-10">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             <span className="ml-2">Loading teachers...</span>
           </div>
         ) : error ? (
            <p className="text-center text-destructive">{error}</p>
         ) : (
           <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assigned Classes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.length > 0 ? (
                  teachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>{teacher.assignedClassIds?.length || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleAssignClasses(teacher.id)} className="gap-1">
                           <BookOpenCheck className="h-4 w-4" />
                           Assign Classes
                        </Button>
                         {/* Add other actions like Edit/View Details if needed */}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No teachers found. Teachers sign up themselves via the login page.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
        )}
      </CardContent>
    </Card>
  );
}