// src/app/admin/students/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";
import type { Student, UserProfile } from "@/lib/types"; // Assuming Student type includes necessary fields

// Define Zod schema for student form validation
const studentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')), // Optional email
  studentInfo: z.string().optional(), // Optional student info like roll number
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentDisplay extends Student {
    // Inherits from Student, potentially add formatted fields if needed
    // Ensure 'id' is available
}


export default function ManageStudentsPage() {
  const [students, setStudents] = useState<StudentDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  // Fetch students from Firestore
  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      // Query users collection for documents where role is 'Student'
      // Note: This assumes student *records* are stored in the 'users' collection with role 'Student'.
      // If students don't have login accounts, they might be in a separate 'students' collection.
      // Adjust the collection name and query as per your Firestore structure.
      const q = query(collection(db, "users"), where("role", "==", "Student"));
      const querySnapshot = await getDocs(q);
      const studentList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<UserProfile, 'uid' | 'createdAt'> & { createdAt: Timestamp }), // Cast carefully based on expected data
        // Map firestore data to StudentDisplay type; ensure all required fields exist
        name: doc.data().name || 'Unnamed Student',
        email: doc.data().email || '',
        role: 'Student', // Set explicitly
        // Add other fields from your Student type definition, fetching if necessary
        classIds: doc.data().classIds || [],
        parentIds: doc.data().parentIds || [],
        studentInfo: doc.data().studentInfo || '',
        avatarUrl: doc.data().avatarUrl,
        // Convert Firestore Timestamp if necessary, though not directly used in table here
      })) as StudentDisplay[];
      setStudents(studentList);
    } catch (err: any) {
      console.error("Error fetching students:", err);
      setError("Failed to load students. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Failed to load students." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []); // Fetch on component mount

  // Handle form submission to add a new student
  const onSubmit: SubmitHandler<StudentFormData> = async (data) => {
    try {
      // Add a new document to the 'users' collection with role 'Student'
      // Again, adjust collection name if students are stored separately.
      const docRef = await addDoc(collection(db, "users"), {
        name: data.name,
        email: data.email || null, // Store null if empty
        role: "Student",
        studentInfo: data.studentInfo || null,
        createdAt: Timestamp.now(),
        // Initialize other fields like classIds, parentIds as empty arrays if needed
        classIds: [],
        parentIds: [],
      });
      console.log("Student added with ID: ", docRef.id);
      toast({ title: "Success", description: "Student added successfully." });
      reset(); // Clear the form
      setIsAddDialogOpen(false); // Close the dialog
      fetchStudents(); // Refresh the student list
    } catch (err: any) {
      console.error("Error adding student:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to add student." });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Manage Students</CardTitle>
            <CardDescription>Add, view, or edit student records.</CardDescription>
        </div>
         <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>Fill in the details for the new student.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <div className="col-span-3">
                        <Input id="name" {...register("name")} className={errors.name ? 'border-destructive' : ''} />
                        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                    </div>
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email (Optional)</Label>
                     <div className="col-span-3">
                        <Input id="email" type="email" {...register("email")} className={errors.email ? 'border-destructive' : ''} placeholder="student@example.com"/>
                        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                    </div>
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="studentInfo" className="text-right">Student Info</Label>
                     <div className="col-span-3">
                        <Input id="studentInfo" {...register("studentInfo")} placeholder="e.g., Roll No, Admission ID"/>
                         {/* No validation needed for optional field unless specified */}
                    </div>
                 </div>
                 <DialogFooter>
                    <DialogClose asChild>
                       <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Student
                    </Button>
                 </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
           <div className="flex justify-center items-center py-10">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             <span className="ml-2">Loading students...</span>
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
                  <TableHead>Student Info</TableHead>
                   <TableHead>Classes</TableHead>
                  <TableHead className="text-right">Actions</TableHead> {/* Placeholder for Edit/Delete */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length > 0 ? (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.email || 'N/A'}</TableCell>
                      <TableCell>{student.studentInfo || 'N/A'}</TableCell>
                       <TableCell>{student.classIds?.length || 0}</TableCell> {/* Display count or IDs */}
                      <TableCell className="text-right">
                        {/* Add Edit/Delete buttons here */}
                         <Button variant="ghost" size="sm" disabled>Edit</Button> {/* Placeholder */}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No students found. Add one using the button above.
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