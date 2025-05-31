
// src/app/admin/classes/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Edit } from "lucide-react";
import type { Class } from "@/lib/types";

const classSchema = z.object({
  name: z.string().min(3, { message: "Class name must be at least 3 characters." }),
  gradeLevel: z.string().optional(),
  teacherId: z.string().optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

interface ClassDisplay extends Class {
  // id is already in Class
}

interface TeacherSelectItem {
  id: string;
  name: string;
}


export default function ManageClassesPage() {
  const { user: authUser, schoolId: adminSchoolId, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<ClassDisplay[]>([]);
  const [teachers, setTeachers] = useState<TeacherSelectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEditingClass, setCurrentEditingClass] = useState<ClassDisplay | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
        name: '',
        gradeLevel: '',
        teacherId: undefined,
    }
  });

  const fetchClasses = async () => {
    if (!adminSchoolId) {
      setError("School ID not found for admin.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "classes"), where("schoolId", "==", adminSchoolId));
      const querySnapshot = await getDocs(q);
      const classList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Class, 'id'>),
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

   const fetchTeachers = async () => {
       if (!adminSchoolId) return;
       setLoadingTeachers(true);
       try {
           const q = query(collection(db, "users"), where("role", "==", "Teacher"), where("schoolId", "==", adminSchoolId));
           const querySnapshot = await getDocs(q);
           const teacherList = querySnapshot.docs.map(doc => ({
               id: doc.id,
               name: doc.data().name || `Teacher (${doc.id.substring(0,4)})`,
           }));
           setTeachers(teacherList);
       } catch (err) {
           console.error("Error fetching teachers:", err);
           toast({ variant: "destructive", title: "Error", description: "Failed to load teachers for dropdown." });
       } finally {
           setLoadingTeachers(false);
       }
   };


  useEffect(() => {
    if (authLoading) return;
    if (!authUser || !adminSchoolId) {
      setError("User not authenticated or school ID missing.");
      setLoading(false);
      setLoadingTeachers(false);
      return;
    }
    fetchClasses();
    fetchTeachers();
  }, [authUser, authLoading, adminSchoolId]);

  const onAddSubmit: SubmitHandler<ClassFormData> = async (data) => {
    if (!adminSchoolId) {
      toast({ variant: "destructive", title: "Error", description: "Admin school ID is missing." });
      return;
    }
    try {
      await addDoc(collection(db, "classes"), {
        name: data.name,
        gradeLevel: data.gradeLevel || null,
        teacherId: data.teacherId === 'none_teacher_option' || !data.teacherId ? null : data.teacherId,
        createdAt: Timestamp.now(),
        studentIds: [],
        schoolId: adminSchoolId, // Add schoolId
      });
      toast({ title: "Success", description: "Class added successfully." });
      reset({ name: '', gradeLevel: '', teacherId: undefined });
      setIsAddDialogOpen(false);
      fetchClasses();
    } catch (err: any) {
      console.error("Error adding class:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to add class." });
    }
  };

  const handleOpenEditDialog = (classToEdit: ClassDisplay) => {
    setCurrentEditingClass(classToEdit);
    reset({
        name: classToEdit.name,
        gradeLevel: classToEdit.gradeLevel || '',
        teacherId: classToEdit.teacherId || undefined,
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit: SubmitHandler<ClassFormData> = async (data) => {
    if (!currentEditingClass) return;
    // Ensure schoolId cannot be changed through this edit form
    if (currentEditingClass.schoolId !== adminSchoolId) {
        toast({ variant: "destructive", title: "Error", description: "Cannot edit class belonging to another school." });
        return;
    }
    try {
      const classRef = doc(db, "classes", currentEditingClass.id);
      await updateDoc(classRef, {
        name: data.name,
        gradeLevel: data.gradeLevel || null,
        teacherId: data.teacherId === 'none_teacher_option' || !data.teacherId ? null : data.teacherId,
        // schoolId remains unchanged
      });
      toast({ title: "Success", description: "Class updated successfully." });
      reset({ name: '', gradeLevel: '', teacherId: undefined });
      setIsEditDialogOpen(false);
      setCurrentEditingClass(null);
      fetchClasses();
    } catch (err: any) {
      console.error("Error updating class:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to update class." });
    }
  };


  if (authLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Classes</CardTitle>
            <CardDescription>Add, view, or edit classes for your school.</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) reset({ name: '', gradeLevel: '', teacherId: undefined });
              else if (teachers.length === 0 && !loadingTeachers) fetchTeachers();
              }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1" disabled={!adminSchoolId}>
                  <PlusCircle className="h-4 w-4" />
                  Add Class
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Class</DialogTitle>
                  <DialogDescription>Fill in the details for the new class.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onAddSubmit)} className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="add-name" className="text-right">Name</Label>
                      <div className="col-span-3">
                          <Input id="add-name" {...register("name")} className={errors.name ? 'border-destructive' : ''} placeholder="e.g., Mathematics 10A" />
                          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                      </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="add-gradeLevel" className="text-right">Grade</Label>
                      <div className="col-span-3">
                          <Input id="add-gradeLevel" {...register("gradeLevel")} placeholder="e.g., 10"/>
                      </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="add-teacherId" className="text-right">Teacher</Label>
                      <div className="col-span-3">
                          <Controller
                              control={control}
                              name="teacherId"
                              render={({ field }) => (
                                  <Select
                                      onValueChange={field.onChange}
                                      value={field.value || ''}
                                      disabled={loadingTeachers}
                                  >
                                      <SelectTrigger id="add-teacherId">
                                          <SelectValue placeholder={loadingTeachers ? "Loading..." : "Select Teacher (Optional)"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="none_teacher_option">None</SelectItem>
                                          {teachers.map(teacher => (
                                              <SelectItem key={teacher.id} value={teacher.id}>
                                                  {teacher.name}
                                              </SelectItem>
                                          ))}
                                          {!loadingTeachers && teachers.length === 0 && (
                                              <SelectItem value="no_teachers_available" disabled>No teachers available for this school</SelectItem>
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
          ) : !adminSchoolId ? (
              <p className="text-center text-destructive">Admin school ID not found. Cannot load classes.</p>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.length > 0 ? (
                    classes.map((cls) => (
                      <TableRow key={cls.id}>
                        <TableCell className="font-medium">{cls.name}</TableCell>
                        <TableCell>{cls.gradeLevel || 'N/A'}</TableCell>
                        <TableCell>{teachers.find(t => t.id === cls.teacherId)?.name || (cls.teacherId ? 'Unknown Teacher' : 'N/A')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(cls)} className="gap-1">
                            <Edit className="h-3 w-3" /> Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No classes found for your school. Add one using the button above.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            reset({ name: '', gradeLevel: '', teacherId: undefined });
            setCurrentEditingClass(null);
          }
          }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>Update the details for {currentEditingClass?.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onEditSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <div className="col-span-3">
                    <Input id="edit-name" {...register("name")} className={errors.name ? 'border-destructive' : ''} />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-gradeLevel" className="text-right">Grade</Label>
                <div className="col-span-3">
                    <Input id="edit-gradeLevel" {...register("gradeLevel")} />
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-teacherId" className="text-right">Teacher</Label>
                <div className="col-span-3">
                    <Controller
                        control={control}
                        name="teacherId"
                        render={({ field }) => (
                            <Select
                                onValueChange={field.onChange}
                                value={field.value || ''}
                                disabled={loadingTeachers}
                            >
                                <SelectTrigger id="edit-teacherId">
                                    <SelectValue placeholder={loadingTeachers ? "Loading..." : "Select Teacher (Optional)"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none_teacher_option">None</SelectItem>
                                    {teachers.map(teacher => (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                            {teacher.name}
                                        </SelectItem>
                                    ))}
                                    {!loadingTeachers && teachers.length === 0 && (
                                        <SelectItem value="no_teachers_available" disabled>No teachers available for this school</SelectItem>
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
                <Button type="submit" disabled={isSubmitting || loadingTeachers}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
