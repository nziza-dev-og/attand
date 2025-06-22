
// src/app/admin/students/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Edit, Image as ImageIcon, Upload, Trash2, Users } from "lucide-react";
import type { Student, UserProfile, Class } from "@/lib/types";
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

interface StudentDisplay extends Student {}
interface ClassSelectItem { id: string; name: string; }

interface GroupedStudents {
  byClass: Record<string, StudentDisplay[]>;
  unassigned: StudentDisplay[];
}

export default function ManageStudentsPage() {
  const { user: authUser, schoolId: adminSchoolId, loading: authLoading } = useAuth();
  const { translate } = useLanguage();
  
  const [allStudents, setAllStudents] = useState<StudentDisplay[]>([]);
  const [allClasses, setAllClasses] = useState<ClassSelectItem[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditAvatarDialogOpen, setIsEditAvatarDialogOpen] = useState(false);
  const [currentEditingStudent, setCurrentEditingStudent] = useState<StudentDisplay | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentDisplay | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [isSubmittingAvatar, setIsSubmittingAvatar] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false); 
  
  // State for viewing parent details
  const [isViewParentsDialogOpen, setIsViewParentsDialogOpen] = useState(false);
  const [selectedStudentForParents, setSelectedStudentForParents] = useState<StudentDisplay | null>(null);
  const [linkedParentsDetails, setLinkedParentsDetails] = useState<UserProfile[]>([]);
  const [loadingParentDetails, setLoadingParentDetails] = useState(false);

  const { toast } = useToast();

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: { name: '', email: '', studentInfo: '', avatarUrl: '', classId: undefined }
  });

  const fetchData = useCallback(async () => {
    if (!adminSchoolId || authLoading) {
      if (!authLoading && !adminSchoolId) {
        setError(translate("studentManagementErrorNoSchoolId") || "School ID not found for admin.");
        setLoadingData(false);
      }
      return;
    }
    setLoadingData(true);
    setError(null);
    try {
      const studentsQuery = query(collection(db, "users"), where("role", "==", "Student"), where("schoolId", "==", adminSchoolId));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentList = studentsSnapshot.docs.map(doc => ({
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
      setAllStudents(studentList);

      const classesQuery = query(collection(db, "classes"), where("schoolId", "==", adminSchoolId));
      const classesSnapshot = await getDocs(classesQuery);
      const classListItems = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || `Class (${doc.id.substring(0,4)})`,
      }));
      setAllClasses(classListItems);

    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(translate("studentManagementErrorLoadFailed") || "Failed to load students or classes. Please try again.");
      toast({ variant: "destructive", title: "Error", description: translate("studentManagementErrorLoadFailed") });
    } finally {
      setLoadingData(false);
    }
  }, [adminSchoolId, authLoading, toast, translate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedStudents = useMemo(() => {
    const byClass: Record<string, StudentDisplay[]> = {};
    const unassigned: StudentDisplay[] = [];
    allClasses.forEach(cls => { byClass[cls.id] = []; });
    allStudents.forEach(student => {
      let assigned = false;
      if (student.classIds && student.classIds.length > 0) {
        student.classIds.forEach(classId => {
          if (byClass[classId]) {
            byClass[classId].push(student);
            assigned = true;
          }
        });
      }
      if (!assigned) { unassigned.push(student); }
    });
    return { byClass, unassigned };
  }, [allStudents, allClasses]);

  const onAddSubmit: SubmitHandler<StudentFormData> = async (data) => {
    if (!adminSchoolId) {
      toast({ variant: "destructive", title: "Error", description: translate("studentManagementErrorNoSchoolIdSubmit") });
      return;
    }
    try {
      const studentData: any = {
        name: data.name, email: data.email || null, role: "Student", studentInfo: data.studentInfo || null,
        avatarUrl: data.avatarUrl || null, createdAt: Timestamp.now(), 
        classIds: data.classId && data.classId !== 'none_class_option' ? [data.classId] : [],
        parentIds: [], schoolId: adminSchoolId, 
      };
      const docRef = await addDoc(collection(db, "users"), studentData);
      if (data.classId && data.classId !== 'none_class_option') {
        const classRef = doc(db, "classes", data.classId);
        const classSnap = await getDoc(classRef);
        if(classSnap.exists() && classSnap.data().schoolId === adminSchoolId) {
            await updateDoc(classRef, { studentIds: arrayUnion(docRef.id) });
        } else {
            toast({ variant: "warning", title: translate("studentManagementWarningClassMismatchTitle"), description: translate("studentManagementWarningClassMismatchDesc") });
        }
      }
      toast({ title: translate("studentManagementSuccessAddTitle"), description: translate("studentManagementSuccessAddDesc") });
      reset(); setIsAddDialogOpen(false); fetchData();
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
      try { new URL(newAvatarUrl.trim()); } catch (_) {
         if(newAvatarUrl.trim() !== "") {
            toast({ variant: "destructive", title: "Invalid URL", description: translate("invalidUrlDesc") }); return;
         }
      }
    }
    setIsSubmittingAvatar(true);
    try {
      const studentRef = doc(db, "users", currentEditingStudent!.id);
      await updateDoc(studentRef, { avatarUrl: newAvatarUrl.trim() === "" ? null : newAvatarUrl.trim() });
      toast({ title: translate("studentManagementSuccessAvatarTitle"), description: translate("studentManagementSuccessAvatarDesc") });
      setIsEditAvatarDialogOpen(false); setCurrentEditingStudent(null); fetchData();
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
        setStudentToDelete(null); return;
    }
    setIsDeletingStudent(true);
    try {
        const studentDocRef = doc(db, "users", studentToDelete.id);
        const studentDocSnap = await getDoc(studentDocRef);
        if (!studentDocSnap.exists()) throw new Error("Student document not found.");
        const studentData = studentDocSnap.data() as Student;
        const batch = writeBatch(db);
        batch.delete(studentDocRef);
        if (studentData.classIds && studentData.classIds.length > 0) {
            for (const classId of studentData.classIds) {
                const classRef = doc(db, "classes", classId);
                const classSnap = await getDoc(classRef);
                if (classSnap.exists() && classSnap.data()?.schoolId === adminSchoolId) {
                    batch.update(classRef, { studentIds: arrayRemove(studentToDelete.id) });
                }
            }
        }
        if (studentData.parentIds && studentData.parentIds.length > 0) {
            for (const parentId of studentData.parentIds) {
                const parentRef = doc(db, "users", parentId);
                batch.update(parentRef, { childIds: arrayRemove(studentToDelete.id) });
            }
        }
        await batch.commit();
        toast({ title: translate("studentDeleteSuccessTitle"), description: translate("studentDeleteSuccessDesc", { name: studentToDelete.name }) });
        fetchData();
    } catch (err: any) {
        console.error("Error deleting student:", err);
        toast({ variant: "destructive", title: translate("errorTitle"), description: translate("studentDeleteFailedDesc") });
    } finally {
        setIsDeletingStudent(false); setStudentToDelete(null);
    }
  };

  const handleViewParents = async (student: StudentDisplay) => {
    if (!student.parentIds || student.parentIds.length === 0) {
        toast({ title: translate("noLinkedParentsTitle") || "No Linked Parents", description: translate("noLinkedParentsDesc") || "This student does not have any parents linked." });
        return;
    }
    setSelectedStudentForParents(student);
    setIsViewParentsDialogOpen(true);
    setLoadingParentDetails(true);
    setLinkedParentsDetails([]);
    try {
        const parentsQuery = query(collection(db, "users"), where("__name__", "in", student.parentIds.slice(0, 30)));
        const querySnapshot = await getDocs(parentsQuery);
        const parentList = querySnapshot.docs.map(doc => ({ ...(doc.data() as UserProfile), uid: doc.id }));
        setLinkedParentsDetails(parentList);
    } catch (err: any) {
        toast({ variant: "destructive", title: translate("errorTitle"), description: translate("errorLoadingParentDetails") });
    } finally {
        setLoadingParentDetails(false);
    }
  };

  const renderStudentTable = (studentsToRender: StudentDisplay[]) => (
    <div className="border rounded-md mt-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">{translate("avatarUrlLabel")}</TableHead>
            <TableHead>{translate("nameLabel")}</TableHead>
            <TableHead>{translate("emailLabel")}</TableHead>
            <TableHead>{translate("studentManagementStudentInfoLabel")}</TableHead>
            <TableHead>{translate("linkedParents")}</TableHead>
            <TableHead className="text-right">{translate("actionsLabel")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studentsToRender.length > 0 ? (
            studentsToRender.map((student) => (
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
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => handleViewParents(student)} className="gap-1" disabled={!student.parentIds || student.parentIds.length === 0}>
                    <Users className="h-4 w-4" /> {student.parentIds?.length || 0}
                  </Button>
                </TableCell>
                <TableCell className="text-right space-x-2">
                   <Button variant="outline" size="sm" onClick={() => handleOpenEditAvatarDialog(student)} className="gap-1">
                      <ImageIcon className="h-3 w-3" /> {translate("studentManagementEditAvatarButton")}
                   </Button>
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" onClick={() => setStudentToDelete(student)} className="gap-1">
                              <Trash2 className="h-3 w-3" /> {translate("deleteButtonLabel")}
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
                {translate("studentManagementNoStudentsInClass") || "No students in this class."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (authLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>{translate("manageStudents")}</CardTitle>
            <CardDescription>{translate("studentManagementPageDescClassified") || "View students grouped by class, add new students, or import them."}</CardDescription>
        </div>
        <div className="flex gap-2">
            <Button size="sm" className="gap-1" onClick={() => setIsImportDialogOpen(true)} disabled={!adminSchoolId}>
                <Upload className="h-4 w-4" />
                {translate("studentImportButtonTitle")}
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) reset(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1" disabled={!adminSchoolId}>
                  <PlusCircle className="h-4 w-4" />
                  {translate("studentManagementAddStudentButton")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{translate("studentManagementAddDialogTitle")}</DialogTitle>
                  <DialogDescription>{translate("studentManagementAddDialogDesc")}</DialogDescription>
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
                      <Label htmlFor="email" className="text-right">{translate("studentManagementEmailOptionalLabel")}</Label>
                       <div className="col-span-3">
                          <Input id="email" type="email" {...register("email")} className={errors.email ? 'border-destructive' : ''} placeholder="student@example.com"/>
                          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                      </div>
                   </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="studentInfo" className="text-right">{translate("studentManagementStudentInfoLabel")}</Label>
                       <div className="col-span-3">
                          <Input id="studentInfo" {...register("studentInfo")} placeholder={translate("studentManagementStudentInfoPlaceholder")}/>
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
                      <Label htmlFor="classId" className="text-right">{translate("studentManagementAssignToClassLabel")}</Label>
                      <div className="col-span-3">
                           <Controller
                              control={control}
                              name="classId"
                              render={({ field }) => (
                                  <Select
                                      onValueChange={field.onChange}
                                      value={field.value || 'none_class_option'}
                                      disabled={loadingData || allClasses.length === 0}
                                  >
                                      <SelectTrigger id="classId">
                                          <SelectValue placeholder={loadingData ? translate("loading") : translate("studentManagementSelectClassOptionalPlaceholder")} />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="none_class_option">{translate("studentManagementNoneOption")}</SelectItem>
                                          {allClasses.map(cls => (
                                              <SelectItem key={cls.id} value={cls.id}>
                                                  {cls.name}
                                              </SelectItem>
                                          ))}
                                          {!loadingData && allClasses.length === 0 && (
                                              <SelectItem value="no_classes_available" disabled>{translate("studentManagementNoClassesAvailable")}</SelectItem>
                                          )}
                                      </SelectContent>
                                  </Select>
                               )}
                           />
                      </div>
                   </div>
                   <DialogFooter>
                      <DialogClose asChild>
                         <Button type="button" variant="outline">{translate("cancelButton")}</Button>
                      </DialogClose>
                      <Button type="submit" disabled={isSubmitting || loadingData}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {translate("studentManagementAddStudentButton")}
                      </Button>
                   </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loadingData ? (
           <div className="flex justify-center items-center py-10">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             <span className="ml-2">{translate("studentManagementLoadingStudents")}</span>
           </div>
         ) : error ? (
            <p className="text-center text-destructive">{error}</p>
         ) : !adminSchoolId ? (
            <p className="text-center text-destructive">{translate("studentManagementErrorNoSchoolId")}</p>
         ) : (
            allClasses.length === 0 && groupedStudents.unassigned.length === 0 ? (
                 <p className="text-center text-muted-foreground py-10">{translate("studentManagementNoStudentsFound")}</p>
            ) : (
            <Accordion type="multiple" className="w-full">
              {allClasses.map((cls) => (
                <AccordionItem key={cls.id} value={cls.id}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <span>{cls.name}</span>
                        <span className="text-sm text-muted-foreground">({(groupedStudents.byClass[cls.id] || []).length} {translate("students")})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderStudentTable(groupedStudents.byClass[cls.id] || [])}
                  </AccordionContent>
                </AccordionItem>
              ))}
              {groupedStudents.unassigned.length > 0 && (
                <AccordionItem value="unassigned-students">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <span>{translate("unassignedStudentsTitle") || "Unassigned Students"}</span>
                        <span className="text-sm text-muted-foreground">({groupedStudents.unassigned.length} {translate("students")})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderStudentTable(groupedStudents.unassigned)}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
            )
        )}
      </CardContent>
    </Card>

    <StudentImportDialog 
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        adminSchoolId={adminSchoolId}
        onImportSuccess={() => {
            fetchData(); 
            setIsImportDialogOpen(false);
        }}
        allClasses={allClasses}
    />

    <Dialog open={isEditAvatarDialogOpen} onOpenChange={(open) => {
        setIsEditAvatarDialogOpen(open);
        if (!open) { setCurrentEditingStudent(null); setNewAvatarUrl("");}
    }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>{translate("studentManagementEditAvatarDialogTitle", { name: currentEditingStudent?.name || ""})}</DialogTitle>
                <DialogDescription>{translate("studentManagementEditAvatarDialogDesc")}</DialogDescription>
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
                <DialogClose asChild><Button type="button" variant="outline">{translate("cancelButton")}</Button></DialogClose>
                <Button onClick={handleUpdateAvatar} disabled={isSubmittingAvatar}>
                    {isSubmittingAvatar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {translate("studentManagementSaveAvatarButton")}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    
    <Dialog open={isViewParentsDialogOpen} onOpenChange={setIsViewParentsDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translate('parentDetailsForStudent', { studentName: selectedStudentForParents?.name || "Student" })}</DialogTitle>
          <DialogDescription>{translate('listOfLinkedParentsDesc', 'The following parents are linked to this student.')}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {loadingParentDetails ? (
            <div className="flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">{translate('loadingParentDetails', 'Loading parent details...')}</span>
            </div>
          ) : linkedParentsDetails.length > 0 ? (
            <ul className="space-y-3">
              {linkedParentsDetails.map(parent => (
                <li key={parent.uid} className="flex items-center gap-4 p-2 border rounded-md">
                  <Avatar>
                    <AvatarImage src={parent.avatarUrl || undefined} alt={parent.name} />
                    <AvatarFallback>{getInitials(parent.name || "P")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{parent.name}</p>
                    <p className="text-sm text-muted-foreground">{parent.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground">{translate('noLinkedParents', 'No parents found for this student.')}</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">{translate('closeButton', 'Close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
