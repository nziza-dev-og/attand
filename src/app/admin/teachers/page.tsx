
// src/app/admin/teachers/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpenCheck } from "lucide-react"; 
import type { Teacher, UserProfile } from "@/lib/types"; 
import { useRouter } from "next/navigation";

interface TeacherDisplay extends Omit<UserProfile, 'role' | 'uid' | 'createdAt' | 'schoolId'>, Omit<Teacher, 'id' | 'email' | 'name'>{
    id: string;
    role: 'Teacher';
    schoolId: string; // Ensure schoolId is part of the display type
}


export default function ManageTeachersPage() {
  const { user: authUser, schoolId: adminSchoolId, loading: authLoading } = useAuth();
  const [teachers, setTeachers] = useState<TeacherDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const fetchTeachers = async () => {
    if (!adminSchoolId) {
        setError("School ID not found for admin.");
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "users"), where("role", "==", "Teacher"), where("schoolId", "==", adminSchoolId));
      const querySnapshot = await getDocs(q);
      const teacherList = querySnapshot.docs.map(doc => {
         const data = doc.data();
         return {
             id: doc.id,
             uid: doc.id, 
             name: data.name || 'Unnamed Teacher',
             email: data.email,
             role: 'Teacher',
             assignedClassIds: data.assignedClassIds || [],
             createdAt: data.createdAt as Timestamp,
             schoolId: data.schoolId, // Include schoolId
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
    if (authLoading) return;
    if (!authUser || !adminSchoolId) {
      setError("User not authenticated or school ID missing.");
      setLoading(false);
      return;
    }
    fetchTeachers();
  }, [authUser, authLoading, adminSchoolId]); 

  const handleAssignClasses = (teacherId: string) => {
    router.push(`/admin/assignments?teacherId=${teacherId}`);
  };

  if (authLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
         <div>
            <CardTitle>Manage Teachers</CardTitle>
            <CardDescription>View teacher accounts for your school and manage their class assignments.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
           <div className="flex justify-center items-center py-10">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             <span className="ml-2">Loading teachers...</span>
           </div>
         ) : error ? (
            <p className="text-center text-destructive">{error}</p>
         ) : !adminSchoolId ? (
            <p className="text-center text-destructive">Admin school ID not found. Cannot load teachers.</p>
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
                           Manage Assignments
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No teachers found for your school.
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
