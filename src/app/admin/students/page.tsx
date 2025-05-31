
// src/app/admin/students/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc, arrayUnion, getDoc, deleteDoc, arrayRemove, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Edit, Image as ImageIcon, Upload, Trash2 } from "lucide-react";
import type { Student, UserProfile, Class, Parent } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StudentImportDialog } from "./_components/StudentImportDialog"; 
import { useLanguage } from "@/contexts/LanguageContext";


const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
};

const studentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  studentInfo: z.string().optional(),
  avatarUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  classId: z.string().optional(), 
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentDisplay extends Student {
    // id is already in Student -> UserProfile
}

interface ClassSelectItem {
  id: string;
  name: string;
}

export default function ManageStudentsPage() {
  const { user: authUser, schoolId: adminSchoolId, loading: authLoading } = useAuth();
  const { translate } = useLanguage();
  const [students, setStudents] = useState<StudentDisplay[]>([]);
  const [classes, setClasses] = useState<ClassSelectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditAvatarDialogOpen, setIsEditAvatarDialogOpen] = useState(false);
  const [currentEditingStudent, setCurrentEditingStudent] = useState<StudentDisplay | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentDisplay | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [isSubmittingAvatar, setIsSubmittingAvatar] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false); 


  const { toast } = useToast();

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: { name: '', email: '', studentInfo: '', avatarUrl: '', classId: undefined }
  });

  const fetchStudents = React.useCallback(async () => {
    if (!adminSchoolId) {
      setError(translate("studentManagementErrorNoSchoolId") || "School ID not found for admin.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "users"), where("role", "==", "Student"), where("schoolId", "==", adminSchoolId));
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
        schoolId: doc.data().schoolId, 
      })) as StudentDisplay[];
      setStudents(studentList);
    } catch (err: any) {
      console.error("Error fetching students:", err);
      setError(translate("studentManagementErrorLoadFailed") || "Failed to load students. Please try again.");
      toast({ variant: "destructive", title: "Error", description: translate("studentManagementErrorLoadFailed") });
    } finally {
      setLoading(false);
    }
  }, [adminSchoolId, toast, translate]);

  const fetchClassesForDropdown = React.useCallback(async () => {
    if (!adminSchoolId) return;
    setLoadingClasses(true);
    try {
        const q = query(collection(db, "classes"), where("schoolId", "==", adminSchoolId));
        const querySnapshot = await getDocs(q);
        const classList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || `Class (${doc.id.substring(0,4)})`,
        }));
        setClasses(classList);
    } catch (err) {
        console.error("Error fetching classes for dropdown:", err);
        toast({ variant: "destructive", title: "Error", description: translate("studentManagementErrorLoadClassesFailed") });
    } finally {
        setLoadingClasses(false);
    }
  }, [adminSchoolId, toast, translate]);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser || !adminSchoolId) {
      setError(translate("studentManagementErrorAuthFailed") || "User not authenticated or school ID missing.");
      setLoading(false);
      setLoadingClasses(false);
      return;
    }
    fetchStudents();
    fetchClassesForDropdown();
  }, [authUser, authLoading, adminSchoolId, fetchStudents, fetchClassesForDropdown, translate]);

  const onAddSubmit: SubmitHandler<StudentFormData> = async (data) => {
    if (!adminSchoolId) {
      toast({ variant: "destructive", title: "Error", description: translate("studentManagementErrorNoSchoolIdSubmit") });
      return;
    }
    try {
      const studentData: any = {
        name: data.name,
        email: data.email || null,
        role: "Student",
        studentInfo: data.studentInfo || null,
        avatarUrl: data.avatarUrl || null,
        createdAt: Timestamp.now(),
        classIds: data.classId ? [data.classId] : [],
        parentIds: [],
        schoolId: adminSchoolId, 
      };

      const docRef = await addDoc(collection(db, "users"), studentData);
      
      if (data.classId) {
        const classRef = doc(db, "classes", data.classId);
        const classSnap = await getDoc(classRef);
        if(classSnap.exists() && classSnap.data().schoolId === adminSchoolId) {
            await updateDoc(classRef, {
              studentIds: arrayUnion(docRef.id)
            });
        } else {
            toast({ variant: "warning", title: translate("studentManagementWarningClassMismatchTitle"), description: translate("studentManagementWarningClassMismatchDesc") });
        }
      }

      toast({ title: translate("studentManagementSuccessAddTitle"), description: translate("studentManagementSuccessAddDesc") });
      reset();
      setIsAddDialogOpen(false);
      fetchStudents();
    } catch (err: any) {
      console.error("Error adding student:", err);
      toast({ variant: "destructive", title: "Error", description: translate("studentManagementErrorAddFailed") });
    }
  };

  const handleOpenEditAvatarDialog = (student: StudentDisplay) => {
    setCurrentEditingStudent(student);
    setNewAvatarUrl(student.avatarUrl || "");
    setIsEditAvatarDialogOpen(true);
  };

  const handleUpdateAvatar = async () => {
    if (!currentEditingStudent || !adminSchoolId) return;
    if (currentEditingStudent.schoolId !== adminSchoolId) {
        toast({ variant: "destructive", title: "Error", description: translate("studentManagementErrorAvatarSchoolMismatch") });
        return;
    }

    if (newAvatarUrl.trim() !== "" ) {
      try {
          new URL(newAvatarUrl.trim());
      } catch (_) {
          if(newAvatarUrl.trim() !== "") { 
              toast({ variant: "destructive", title: "Invalid URL", description: translate("invalidUrlDesc") });
              return;
          }
      }
    }

    setIsSubmittingAvatar(true);
    try {
      const studentRef = doc(db, "users", currentEditingStudent!.id);
      await updateDoc(studentRef, {
        avatarUrl: newAvatarUrl.trim() === "" ? null : newAvatarUrl.trim(),
      });
      toast({ title: translate("studentManagementSuccessAvatarTitle"), description: translate("studentManagementSuccessAvatarDesc") });
      setIsEditAvatarDialogOpen(false);
      setCurrentEditingStudent(null);
      fetchStudents(); 
    } catch (err: any) {
      console.error("Error updating avatar:", err);
      toast({ variant: "destructive", title: "Error", description: translate("studentManagementErrorAvatarUpdateFailed") });
    } finally {
      setIsSubmittingAvatar(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete || !adminSchoolId) return;
    if (studentToDelete.schoolId !== adminSchoolId) {
        toast({ variant: "destructive", title: translate("errorTitle"), description: translate("studentManagementErrorDeleteSchoolMismatch") });
        setStudentToDelete(null);
        return;
    }

    setIsDeletingStudent(true);
    try {
        const studentDocRef = doc(db, "users", studentToDelete.id);
        const studentDocSnap = await getDoc(studentDocRef); // Re-fetch to get latest classIds/parentIds
        if (!studentDocSnap.exists()) {
            throw new Error("Student document not found.");
        }
        const studentData = studentDocSnap.data() as Student;

        const batch = writeBatch(db);
        batch.delete(studentDocRef);

        // Remove student from classes
        if (studentData.classIds && studentData.classIds.length > 0) {
            for (const classId of studentData.classIds) {
                const classRef = doc(db, "classes", classId);
                // Ensure class belongs to the same school before updating
                const classSnap = await getDoc(classRef);
                if (classSnap.exists() && classSnap.data()?.schoolId === adminSchoolId) {
                    batch.update(classRef, { studentIds: arrayRemove(studentToDelete.id) });
                }
            }
        }

        // Remove student from parents' childIds
        if (studentData.parentIds && studentData.parentIds.length > 0) {
            for (const parentId of studentData.parentIds) {
                const parentRef = doc(db, "users", parentId);
                // No schoolId check needed for parents here, just remove child link
                batch.update(parentRef, { childIds: arrayRemove(studentToDelete.id) });
            }
        }
        
        await batch.commit();

        toast({ title: translate("studentDeleteSuccessTitle"), description: translate("studentDeleteSuccessDesc", { name: studentToDelete.name }) });
        fetchStudents();
    } catch (err: any)
     {
        console.error("Error deleting student:", err);
        toast({ variant: "destructive", title: translate("errorTitle"), description: translate("studentDeleteFailedDesc") });
    } finally {
        setIsDeletingStudent(false);
        setStudentToDelete(null);
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
            <CardTitle>{translate("manageStudents")}</CardTitle>
            <CardDescription>{translate("studentManagementPageDesc") || "Add, view, or edit student records for your school."}</CardDescription>
        </div>
        <div className="flex gap-2">
            <Button size="sm" className="gap-1" onClick={() => setIsImportDialogOpen(true)} disabled={!adminSchoolId}>
                <Upload className="h-4 w-4" />
                {translate("studentImportButtonTitle") || "Import Students"}
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) reset();
                else if (classes.length === 0 && !loadingClasses) fetchClassesForDropdown();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1" disabled={!adminSchoolId}>
                  <PlusCircle className="h-4 w-4" />
                  {translate("studentManagementAddStudentButton") || "Add Student"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{translate("studentManagementAddDialogTitle") || "Add New Student"}</DialogTitle>
                  <DialogDescription>{translate("studentManagementAddDialogDesc") || "Fill in the details for the new student."}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onAddSubmit)} className="grid gap-4 py-4">
                   <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">{translate("nameLabel")}</Label>
                      <div className="col-span-3">
                          <Input id="name" {...register("name")} className={errors.name ? 'border-destructive' : ''} />
                          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                      </div>
                   </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">{translate("studentManagementEmailOptionalLabel") || "Email (Optional)"}</Label>
                       <div className="col-span-3">
                          <Input id="email" type="email" {...register("email")} className={errors.email ? 'border-destructive' : ''} placeholder="student@example.com"/>
                          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                      </div>
                   </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="studentInfo" className="text-right">{translate("studentManagementStudentInfoLabel") || "Student Info"}</Label>
                       <div className="col-span-3">
                          <Input id="studentInfo" {...register("studentInfo")} placeholder={translate("studentManagementStudentInfoPlaceholder") || "e.g., Roll No, Admission ID"}/>
                      </div>
                   </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="avatarUrl" className="text-right">{translate("avatarUrlLabel")}</Label>
                       <div className="col-span-3">
                          <Input id="avatarUrl" {...register("avatarUrl")} className={errors.avatarUrl ? 'border-destructive' : ''} placeholder="https://example.com/avatar.png"/>
                          {errors.avatarUrl && <p className="text-xs text-destructive mt-1">{errors.avatarUrl.message}</p>}
                      </div>
                   </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="classId" className="text-right">{translate("studentManagementAssignToClassLabel") || "Assign to Class"}</Label>
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
                                          <SelectValue placeholder={loadingClasses ? translate("loading") : translate("studentManagementSelectClassOptionalPlaceholder") || "Select Class (Optional)"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="none_class_option">{translate("studentManagementNoneOption") || "None"}</SelectItem>
                                          {classes.map(cls => (
                                              <SelectItem key={cls.id} value={cls.id}>
                                                  {cls.name}
                                              </SelectItem>
                                          ))}
                                          {!loadingClasses && classes.length === 0 && (
                                              <SelectItem value="no_classes_available" disabled>{translate("studentManagementNoClassesAvailable") || "No classes available for this school"}</SelectItem>
                                          )}
                                      </SelectContent>
                                  </Select>
                               )}
                           />
                      </div>
                   </div>
                   <DialogFooter>
                      <DialogClose asChild>
                         <Button type="button" variant="outline">{translate("cancelButton") || "Cancel"}</Button>
                      </DialogClose>
                      <Button type="submit" disabled={isSubmitting || loadingClasses}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {translate("studentManagementAddStudentButton") || "Add Student"}
                      </Button>
                   </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
           <div className="flex justify-center items-center py-10">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             <span className="ml-2">{translate("studentManagementLoadingStudents") || "Loading students..."}</span>
           </div>
         ) : error ? (
            <p className="text-center text-destructive">{error}</p>
         ) : !adminSchoolId ? (
            <p className="text-center text-destructive">{translate("studentManagementErrorNoSchoolId")}</p>
         ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">{translate("avatarUrlLabel")}</TableHead>
                  <TableHead>{translate("nameLabel")}</TableHead>
                  <TableHead>{translate("emailLabel")}</TableHead>
                  <TableHead>{translate("studentManagementStudentInfoLabel")}</TableHead>
                   <TableHead>{translate("studentManagementClassesLabel") || "Classes"}</TableHead>
                  <TableHead className="text-right">{translate("actionsLabel") || "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length > 0 ? (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.avatarUrl || undefined} alt={student.name} />
                          <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.email || 'N/A'}</TableCell>
                      <TableCell>{student.studentInfo || 'N/A'}</TableCell>
                       <TableCell>{student.classIds?.length || 0}</TableCell>
                      <TableCell className="text-right space-x-2">
                         <Button variant="outline" size="sm" onClick={() => handleOpenEditAvatarDialog(student)} className="gap-1">
                            <ImageIcon className="h-3 w-3" /> {translate("studentManagementEditAvatarButton") || "Edit Avatar"}
                         </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" onClick={() => setStudentToDelete(student)} className="gap-1">
                                    <Trash2 className="h-3 w-3" /> {translate("deleteButtonLabel") || "Delete"}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>{translate("studentDeleteConfirmTitle")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {translate("studentDeleteConfirmDesc", { name: studentToDelete?.name || "this student"})}
                                    {" "}
                                    {translate("studentDeleteConfirmActionUndone")}
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setStudentToDelete(null)}>{translate("cancelButton")}</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteStudent} disabled={isDeletingStudent}>
                                    {isDeletingStudent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {translate("deleteButtonLabel")}
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {translate("studentManagementNoStudentsFound") || "No students found for your school. Add one using the button above."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>

    <StudentImportDialog 
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        adminSchoolId={adminSchoolId}
        onImportSuccess={() => {
            fetchStudents(); 
            setIsImportDialogOpen(false);
        }}
    />

    <Dialog open={isEditAvatarDialogOpen} onOpenChange={(open) => {
        setIsEditAvatarDialogOpen(open);
        if (!open) {
            setCurrentEditingStudent(null);
            setNewAvatarUrl("");
        }
    }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>{translate("studentManagementEditAvatarDialogTitle", { name: currentEditingStudent?.name || ""}) || `Edit Avatar for ${currentEditingStudent?.name}`}</DialogTitle>
                <DialogDescription>{translate("studentManagementEditAvatarDialogDesc") || "Enter a new image URL for the student's avatar."}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="flex justify-center mb-4">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={newAvatarUrl || currentEditingStudent?.avatarUrl || undefined} alt={currentEditingStudent?.name} />
                        <AvatarFallback>{getInitials(currentEditingStudent?.name || "S")}</AvatarFallback>
                    </Avatar>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-avatarUrl" className="text-right">{translate("avatarUrlLabel")}</Label>
                    <div className="col-span-3">
                        <Input
                            id="edit-avatarUrl"
                            value={newAvatarUrl}
                            onChange={(e) => setNewAvatarUrl(e.target.value)}
                            placeholder="https://example.com/new_avatar.png"
                        />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">{translate("cancelButton")}</Button>
                </DialogClose>
                <Button onClick={handleUpdateAvatar} disabled={isSubmittingAvatar}>
                    {isSubmittingAvatar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {translate("studentManagementSaveAvatarButton") || "Save Avatar"}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

