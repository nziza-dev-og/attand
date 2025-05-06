// src/app/admin/classes/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select
import { Controller, useForm, type SubmitHandler } from "react-hook-form"; // Import Controller
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";
import type { Class, Teacher } from "@/lib/types"; // Import types

// Define Zod schema for class form validation
const classSchema = z.object({
  name: z.string().min(3, { message: "Class name must be at least 3 characters." }),
  gradeLevel: z.string().optional(),
  teacherId: z.string().optional(), // Teacher ID is optional for now
});

type ClassFormData = z.infer<typeof classSchema>;

interface ClassDisplay extends Class {
  // Ensure 'id' is available after fetching
}

interface TeacherSelectItem {
  id: string;
  name: string;
}


export default function ManageClassesPage() {
  const [classes, setClasses] = useState<ClassDisplay[]>([]);
  const [teachers, setTeachers] = useState<TeacherSelectItem[]>([]); // State for teachers
  const [loading, setLoading] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true); // Loading state for teachers
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
     defaultValues: {
        name: '',
        gradeLevel: '',
        teacherId: undefined, // Set default for optional select
    }
  });

  // Fetch classes from Firestore
  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(db, "classes"));
      const classList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Class, 'id'>), // Cast remaining data
      })) as ClassDisplay[];
      setClasses(classList);
    } catch (err: any) {
      console.error("Error fetching classes:", err);
      setError("Failed to load classes. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Failed to load classes." });
    } finally {
      setLoading(false);
    }
  };

   // Fetch teachers for the dropdown
   const fetchTeachers = async () => {
       setLoadingTeachers(true);
       try {
           const q = query(collection(db, "users"), where("role", "==", "Teacher"));
           const querySnapshot = await getDocs(q);
           const teacherList = querySnapshot.docs.map(doc => ({
               id: doc.id,
               name: doc.data().name || `Teacher (${doc.id.substring(0,4)})`,
           }));
           setTeachers(teacherList);
       } catch (err) {
           console.error("Error fetching teachers:", err);
           toast({ variant: "destructive", title: "Error", description: "Failed to load teachers for dropdown." });
           // Don't block the dialog from opening if teachers fail to load, maybe show a message
       } finally {
           setLoadingTeachers(false);
       }
   };


  useEffect(() => {
    fetchClasses();
    fetchTeachers(); // Fetch teachers on component mount
  }, [toast]);

  // Handle form submission to add a new class
  const onSubmit: SubmitHandler<ClassFormData> = async (data) => {
    try {
      const docRef = await addDoc(collection(db, "classes"), {
        name: data.name,
        gradeLevel: data.gradeLevel || null,
        teacherId: data.teacherId || null, // Use selected teacher ID or null
        createdAt: Timestamp.now(),
        studentIds: [], // Initialize studentIds as empty array
        // Remove subject and schedule
      });
      console.log("Class added with ID: ", docRef.id);
      toast({ title: "Success", description: "Class added successfully." });
      reset(); // Clear the form
      setIsAddDialogOpen(false); // Close the dialog
      fetchClasses(); // Refresh the class list
    } catch (err: any) {
      console.error("Error adding class:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to add class." });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Classes</CardTitle>
          <CardDescription>Add, view, or edit classes.</CardDescription>
        </div>
         <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
             setIsAddDialogOpen(open);
             if (!open) reset(); // Reset form when closing
             else if (teachers.length === 0 && !loadingTeachers) fetchTeachers(); // Refetch teachers if needed when opening
             }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-4 w-4" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Class</DialogTitle>
                <DialogDescription>Fill in the details for the new class.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <div className="col-span-3">
                        <Input id="name" {...register("name")} className={errors.name ? 'border-destructive' : ''} placeholder="e.g., Mathematics 10A" />
                        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                    </div>
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="gradeLevel" className="text-right">Grade</Label>
                    <div className="col-span-3">
                        <Input id="gradeLevel" {...register("gradeLevel")} placeholder="e.g., 10"/>
                    </div>
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="teacherId" className="text-right">Teacher</Label>
                    <div className="col-span-3">
                         {/* Use Controller for react-hook-form with ShadCN Select */}
                         <Controller
                            control={control}
                            name="teacherId"
                            render={({ field }) => (
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ''} // Handle undefined value
                                    disabled={loadingTeachers}
                                >
                                    <SelectTrigger id="teacherId">
                                        <SelectValue placeholder={loadingTeachers ? "Loading..." : "Select Teacher (Optional)"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* Add an explicit "None" option if teacher is optional */}
                                        <SelectItem value="none_teacher_option">None</SelectItem>
                                        {teachers.map(teacher => (
                                            <SelectItem key={teacher.id} value={teacher.id}>
                                                {teacher.name}
                                            </SelectItem>
                                        ))}
                                        {!loadingTeachers && teachers.length === 0 && (
                                            <SelectItem value="no_teachers_available" disabled>No teachers available</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                             )}
                         />
                         {/* Optional: Add error display for teacherId if needed */}
                         {/* {errors.teacherId && <p className="text-xs text-destructive mt-1">{errors.teacherId.message}</p>} */}
                    </div>
                 </div>

                 {/* Removed Subject and Schedule inputs */}

                 <DialogFooter>
                     <DialogClose asChild>
                       <Button type="button" variant="outline">Cancel</Button>
                     </DialogClose>
                    <Button type="submit" disabled={isSubmitting || loadingTeachers}>
                         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Class
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
             <span className="ml-2">Loading classes...</span>
           </div>
         ) : error ? (
            <p className="text-center text-destructive">{error}</p>
         ) : (
           <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {/* <TableHead>Subject</TableHead> */}
                  <TableHead>Grade</TableHead>
                  {/* <TableHead>Schedule</TableHead> */}
                   <TableHead>Teacher</TableHead> {/* Added Teacher column */}
                  <TableHead className="text-right">Actions</TableHead>{/* Placeholder */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length > 0 ? (
                  classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      {/* <TableCell>{cls.subject || 'N/A'}</TableCell> */}
                      <TableCell>{cls.gradeLevel || 'N/A'}</TableCell>
                       {/* Look up teacher name - might need adjustment based on how data is fetched/joined */}
                       <TableCell>{teachers.find(t => t.id === cls.teacherId)?.name || (cls.teacherId ? 'Unknown Teacher' : 'N/A')}</TableCell>
                      {/* <TableCell>{cls.schedule || 'N/A'}</TableCell> */}
                      <TableCell className="text-right">
                        {/* Add Edit/Delete buttons here */}
                        <Button variant="ghost" size="sm" disabled>Edit</Button> {/* Placeholder */}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center"> {/* Adjusted colSpan */}
                      No classes found. Add one using the button above.
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
