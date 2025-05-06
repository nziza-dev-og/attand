// src/app/admin/students/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";
import type { Student, UserProfile, Class } from "@/lib/types";

// Define Zod schema for student form validation
const studentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  studentInfo: z.string().optional(),
  classId: z.string().optional(), // Optional: class to assign student to
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentDisplay extends Student {
    // Ensure 'id' is available
}

interface ClassSelectItem {
  id: string;
  name: string;
}

export default function ManageStudentsPage() {
  const [students, setStudents] = useState<StudentDisplay[]>([]);
  const [classes, setClasses] = useState<ClassSelectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
        name: '',
        email: '',
        studentInfo: '',
        classId: undefined,
    }
  });

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "users"), where("role", "==", "Student"));
      const querySnapshot = await getDocs(q);
      const studentList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<UserProfile, 'uid' | 'createdAt'> & { createdAt: Timestamp }),
        name: doc.data().name || 'Unnamed Student',
        email: doc.data().email || '',
        role: 'Student',
        classIds: doc.data().classIds || [],
        parentIds: doc.data().parentIds || [],
        studentInfo: doc.data().studentInfo || '',
        avatarUrl: doc.data().avatarUrl,
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

  const fetchClassesForDropdown = async () => {
    setLoadingClasses(true);
    try {
        const querySnapshot = await getDocs(collection(db, "classes"));
        const classList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || `Class (${doc.id.substring(0,4)})`,
        }));
        setClasses(classList);
    } catch (err) {
        console.error("Error fetching classes for dropdown:", err);
        toast({ variant: "destructive", title: "Error", description: "Failed to load classes for assignment." });
    } finally {
        setLoadingClasses(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClassesForDropdown();
  }, [toast]);

  const onSubmit: SubmitHandler<StudentFormData> = async (data) => {
    try {
      const studentData: any = {
        name: data.name,
        email: data.email || null,
        role: "Student",
        studentInfo: data.studentInfo || null,
        createdAt: Timestamp.now(),
        classIds: data.classId ? [data.classId] : [],
        parentIds: [],
      };

      const docRef = await addDoc(collection(db, "users"), studentData);
      
      // If a class was selected, update the class document as well
      if (data.classId) {
        const classRef = doc(db, "classes", data.classId);
        await updateDoc(classRef, {
          studentIds: arrayUnion(docRef.id)
        });
      }

      toast({ title: "Success", description: "Student added successfully." });
      reset();
      setIsAddDialogOpen(false);
      fetchStudents();
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
         <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
             setIsAddDialogOpen(open);
             if (!open) reset();
             else if (classes.length === 0 && !loadingClasses) fetchClassesForDropdown();
         }}>
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
                    </div>
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="classId" className="text-right">Assign to Class</Label>
                    <div className="col-span-3">
                         <Controller
                            control={control}
                            name="classId"
                            render={({ field }) => (
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ''}
                                    disabled={loadingClasses}
                                >
                                    <SelectTrigger id="classId">
                                        <SelectValue placeholder={loadingClasses ? "Loading..." : "Select Class (Optional)"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">None</SelectItem>
                                        {classes.map(cls => (
                                            <SelectItem key={cls.id} value={cls.id}>
                                                {cls.name}
                                            </SelectItem>
                                        ))}
                                        {!loadingClasses && classes.length === 0 && (
                                            <SelectItem value="" disabled>No classes available</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                             )}
                         />
                    </div>
                 </div>
                 <DialogFooter>
                    <DialogClose asChild>
                       <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting || loadingClasses}>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length > 0 ? (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.email || 'N/A'}</TableCell>
                      <TableCell>{student.studentInfo || 'N/A'}</TableCell>
                       <TableCell>{student.classIds?.length || 0}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="sm" disabled>Edit</Button>
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
