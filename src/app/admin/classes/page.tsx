// src/app/admin/classes/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
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
import type { Class } from "@/lib/types"; // Import the Class type

// Define Zod schema for class form validation
const classSchema = z.object({
  name: z.string().min(3, { message: "Class name must be at least 3 characters." }),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  schedule: z.string().optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

interface ClassDisplay extends Class {
  // Ensure 'id' is available after fetching
}

export default function ManageClassesPage() {
  const [classes, setClasses] = useState<ClassDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
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

  useEffect(() => {
    fetchClasses();
  }, []); // Fetch on component mount

  // Handle form submission to add a new class
  const onSubmit: SubmitHandler<ClassFormData> = async (data) => {
    try {
      const docRef = await addDoc(collection(db, "classes"), {
        name: data.name,
        subject: data.subject || null,
        gradeLevel: data.gradeLevel || null,
        schedule: data.schedule || null,
        createdAt: Timestamp.now(), // Add a timestamp if needed
        // Initialize teacherId and studentIds as null/empty or omit if not needed immediately
        teacherId: null,
        studentIds: [],
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
         <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                    <Label htmlFor="subject" className="text-right">Subject (Optional)</Label>
                    <div className="col-span-3">
                        <Input id="subject" {...register("subject")} placeholder="e.g., Mathematics"/>
                    </div>
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="gradeLevel" className="text-right">Grade (Optional)</Label>
                    <div className="col-span-3">
                        <Input id="gradeLevel" {...register("gradeLevel")} placeholder="e.g., 10"/>
                    </div>
                 </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="schedule" className="text-right">Schedule (Optional)</Label>
                    <div className="col-span-3">
                        <Input id="schedule" {...register("schedule")} placeholder="e.g., Mon, Wed 9-10 AM"/>
                    </div>
                 </div>
                 <DialogFooter>
                     <DialogClose asChild>
                       <Button type="button" variant="outline">Cancel</Button>
                     </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
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
                <TableRow>{/* Removed potential whitespace here */}
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Actions</TableHead>{/* Placeholder */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length > 0 ? (
                  classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.subject || 'N/A'}</TableCell>
                      <TableCell>{cls.gradeLevel || 'N/A'}</TableCell>
                      <TableCell>{cls.schedule || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        {/* Add Edit/Delete buttons here */}
                        <Button variant="ghost" size="sm" disabled>Edit</Button> {/* Placeholder */}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
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
