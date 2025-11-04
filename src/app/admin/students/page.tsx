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
import { Loader2, PlusCircle, Edit, Image as ImageIcon, Upload, Trash2, Users, Move, PhoneCall, Settings } from "lucide-react";
import type { Student, UserProfile, Class, AcademicYear } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StudentImportDialog } from "./_components/StudentImportDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { Checkbox } from "@/components/ui/checkbox";
import Link from 'next/link';

const getInitials = (name: string = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase() || '??';

const studentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  studentIdInfo: z.string().optional(),
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
  const [activeAcademicYear, setActiveAcademicYear] = useState<AcademicYear | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditAvatarDialogOpen, setIsEditAvatarDialogOpen] = useState(false);
  const [currentEditingStudent, setCurrentEditingStudent] = useState<StudentDisplay | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [isSubmittingAvatar, setIsSubmittingAvatar] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [targetClassId, setTargetClassId] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  // State for viewing parent details
  const [isViewParentsDialogOpen, setIsViewParentsDialogOpen] = useState(false);
  const [selectedStudentForParents, setSelectedStudentForParents] = useState<StudentDisplay | null>(null);
  const [linkedParentsDetails, setLinkedParentsDetails] = useState<UserProfile[]>([]);
  const [loadingParentDetails, setLoadingParentDetails] = useState(false);

  const { toast } = useToast();

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: { name: '', studentIdInfo: '', avatarUrl: '', classId: undefined }
  });

  // Fetch all needed data
  const fetchData = useCallback(async () => {
    if (!adminSchoolId || authLoading) {
      if (!authLoading && !adminSchoolId) {
        setError(translate("studentManagementErrorNoSchoolId"));
        setLoadingData(false);
      }
      return;
    }
    setLoadingData(true);
    setError(null);
    try {
      // Academic Year
      const academicYearQuery = query(
        collection(db, "academicYears"),
        where("schoolId", "==", adminSchoolId),
        where("isActive", "==", true)
      );
      const academicYearSnapshot = await getDocs(academicYearQuery);
      if (academicYearSnapshot.empty) {
        setError("No active academic year found. Please create and activate one in the school settings to manage student enrollments.");
        setAllStudents([]);
        setAllClasses([]);
        setActiveAcademicYear(null);
        setLoadingData(false);
        return;
      }
      const yearDoc = academicYearSnapshot.docs[0];
      const yearData = { id: yearDoc.id, ...yearDoc.data() } as AcademicYear;
      setActiveAcademicYear(yearData);

      // Students
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "Student"),
        where("schoolId", "==", adminSchoolId)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentList = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<UserProfile, 'uid' | 'createdAt'> & { createdAt: Timestamp }),
        name: doc.data().name || 'Unnamed Student',
        email: null,
        role: 'Student',
        classIds: doc.data().classIds || [],
        parentIds: doc.data().parentIds || [],
        studentIdInfo: doc.data().studentIdInfo || '',
        avatarUrl: doc.data().avatarUrl,
        schoolId: doc.data().schoolId,
      })) as StudentDisplay[];
      setAllStudents(studentList);

      // Classes
      const classesQuery = query(collection(db, "classes"), where("schoolId", "==", adminSchoolId));
      const classesSnapshot = await getDocs(classesQuery);
      const classListItems = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setAllClasses(classListItems);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(translate("studentManagementErrorLoadFailed"));
      toast({ variant: "destructive", title: "Error", description: translate("studentManagementErrorLoadFailed") });
    } finally {
      setLoadingData(false);
    }
  }, [adminSchoolId, authLoading, toast, translate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group students by class for viewing
  const groupedStudents = useMemo(() => {
    const byClass: Record<string, StudentDisplay[]> = {};
    const unassigned: StudentDisplay[] = [];
    allClasses.forEach(cls => { byClass[cls.id] = []; });

    if (!activeAcademicYear || !activeAcademicYear.activeTermId) {
      allStudents.forEach(student => unassigned.push(student));
      return { byClass, unassigned };
    }

    const activeTermId = activeAcademicYear.activeTermId;
    const activeTerm = activeAcademicYear.terms.find(t => t.id === activeTermId);

    if (!activeTerm || !activeTerm.studentEnrollments) {
      allStudents.forEach(student => unassigned.push(student));
      return { byClass, unassigned };
    }

    const enrolledStudentsThisTerm = new Set<string>();
    Object.values(activeTerm.studentEnrollments).forEach(studentIds => {
      if(Array.isArray(studentIds)) {
        studentIds.forEach(id => enrolledStudentsThisTerm.add(id));
      }
    });

    allStudents.forEach(student => {
      let assignedInTerm = false;
      for (const classId in activeTerm.studentEnrollments) {
        if (activeTerm.studentEnrollments[classId]?.includes(student.id)) {
          if (byClass[classId]) {
            byClass[classId].push(student);
            assignedInTerm = true;
          }
        }
      }
      if (!assignedInTerm) {
        unassigned.push(student);
      }
    });
    return { byClass, unassigned };
  }, [allStudents, allClasses, activeAcademicYear]);


  // Submit logic for student add
  const onAddSubmit: SubmitHandler<StudentFormData> = async (data) => {
    if (!adminSchoolId || !activeAcademicYear?.id || !activeAcademicYear?.activeTermId) {
      toast({ variant: "destructive", title: "Error", description: "Active academic year/term context is missing." });
      return;
    }
    try {
      const batch = writeBatch(db);
      const studentDocRef = doc(collection(db, "users"));
      const studentData: any = {
        name: data.name,
        email: null,
        role: "Student",
        studentIdInfo: data.studentIdInfo || undefined,
        avatarUrl: data.avatarUrl || undefined,
        createdAt: Timestamp.now(),
        parentIds: [],
        schoolId: adminSchoolId,
      };
      batch.set(studentDocRef, studentData);

      if (data.classId && data.classId !== 'none_class_option') {
        const yearDocRef = doc(db, "academicYears", activeAcademicYear.id);
        const fieldToUpdate = `terms.${activeAcademicYear.activeTermId}.studentEnrollments.${data.classId}`;
        batch.update(yearDocRef, { [fieldToUpdate]: arrayUnion(studentDocRef.id) });
      }
      await batch.commit();

      toast({ title: translate("studentManagementSuccessAddTitle"), description: translate("studentManagementSuccessAddDesc") });
      reset();
      setIsAddDialogOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Error adding student:", err);
      toast({ variant: "destructive", title: "Error", description: translate("studentManagementErrorAddFailed") });
    }
  };

  // Edit avatar dialog logic
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
    if (newAvatarUrl.trim() !== "") {
      try {
        new URL(newAvatarUrl.trim());
      } catch (_) {
        toast({ variant: "destructive", title: "Invalid URL", description: translate("invalidUrlDesc") });
        return;
      }
    }
    setIsSubmittingAvatar(true);
    try {
      const studentRef = doc(db, "users", currentEditingStudent.id);
      await updateDoc(studentRef, { avatarUrl: newAvatarUrl.trim() === "" ? null : newAvatarUrl.trim() });
      toast({ title: translate("studentManagementSuccessAvatarTitle"), description: translate("studentManagementSuccessAvatarDesc") });
      setIsEditAvatarDialogOpen(false);
      setCurrentEditingStudent(null);
      fetchData();
    } catch (err: any) {
      console.error("Error updating avatar:", err);
      toast({ variant: "destructive", title: "Error", description: translate("studentManagementErrorAvatarUpdateFailed") });
    } finally {
      setIsSubmittingAvatar(false);
    }
  };

  // Delete selected students batch
  const handleDeleteSelected = async () => {
    if (selectedStudents.size === 0 || !adminSchoolId) return;
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      const studentDocs = new Map<string, Student>();

      for (const studentId of Array.from(selectedStudents)) {
        const studentDocRef = doc(db, "users", studentId);
        const studentDocSnap = await getDoc(studentDocRef);
        if (studentDocSnap.exists() && studentDocSnap.data()?.schoolId === adminSchoolId) {
          studentDocs.set(studentId, studentDocSnap.data() as Student);
          batch.delete(studentDocRef);
        }
      }

      if (activeAcademicYear) {
        const yearRef = doc(db, "academicYears", activeAcademicYear.id);
        const activeTerm = activeAcademicYear.terms.find(t => t.id === activeAcademicYear.activeTermId);
        if (activeTerm) {
          const enrollmentUpdates: Record<string, any> = {};
          Object.entries(activeTerm.studentEnrollments).forEach(([classId, studentIdsInClass]) => {
            const studentsToRemove = studentIdsInClass.filter(id => selectedStudents.has(id));
            if (studentsToRemove.length > 0) {
              enrollmentUpdates[`terms.${activeTerm.id}.studentEnrollments.${classId}`] = arrayRemove(...studentsToRemove);
            }
          });
          if (Object.keys(enrollmentUpdates).length > 0) {
            batch.update(yearRef, enrollmentUpdates);
          }
        }
      }

      const parentUpdates = new Map<string, string[]>();
      studentDocs.forEach((studentData, studentId) => {
        studentData.parentIds?.forEach(parentId => {
          if (!parentUpdates.has(parentId)) parentUpdates.set(parentId, []);
          parentUpdates.get(parentId)?.push(studentId);
        });
      });

      parentUpdates.forEach((studentIds, parentId) => {
        const parentRef = doc(db, "users", parentId);
        batch.update(parentRef, { childIds: arrayRemove(...studentIds) });
      });

      await batch.commit();

      toast({ title: translate("studentDeleteSuccessTitle"), description: `${selectedStudents.size} students deleted.` });
      fetchData();
      setSelectedStudents(new Set());
    } catch (err: any) {
      console.error("Error deleting students:", err);
      toast({ variant: "destructive", title: translate("errorTitle"), description: translate("studentDeleteFailedDesc") });
    } finally {
      setIsDeleting(false);
    }
  };

  // Moving students
  const handleMoveSelectedStudents = async () => {
    if (selectedStudents.size === 0 || !targetClassId || !adminSchoolId || !activeAcademicYear) {
      toast({ variant: "destructive", title: "Error", description: translate("studentMoveErrorSelection") });
      return;
    }
    setIsMoving(true);

    const batch = writeBatch(db);
    const studentIdsToMove = Array.from(selectedStudents);

    try {
      const yearRef = doc(db, "academicYears", activeAcademicYear.id);
      const activeTerm = activeAcademicYear.terms.find(t => t.id === activeAcademicYear.activeTermId);
      if (!activeTerm) throw new Error("Active term not found.");

      // Remove from old classes
      const removalUpdates: Record<string, any> = {};
      Object.entries(activeTerm.studentEnrollments).forEach(([classId, studentIdsInClass]) => {
        const studentsToRemove = studentIdsInClass.filter(id => studentIdsToMove.includes(id));
        if (studentsToRemove.length > 0) {
          removalUpdates[`terms.${activeTerm.id}.studentEnrollments.${classId}`] = arrayRemove(...studentsToRemove);
        }
      });
      if (Object.keys(removalUpdates).length > 0) {
        batch.update(yearRef, removalUpdates);
      }

      // Add to new class
      const fieldToUpdate = `terms.${activeTerm.id}.studentEnrollments.${targetClassId}`;
      batch.update(yearRef, { [fieldToUpdate]: arrayUnion(...studentIdsToMove) });

      await batch.commit();

      toast({
        title: translate("studentMoveSuccessTitle"),
        description: translate("studentMoveSuccessDesc", { count: studentIdsToMove.length.toString() })
      });
      fetchData();
      setSelectedStudents(new Set());
      setIsMoveDialogOpen(false);
      setTargetClassId('');
    } catch (err: any) {
      console.error("Error moving students:", err);
      toast({ variant: "destructive", title: "Error", description: translate("studentMoveErrorFailed") });
    } finally {
      setIsMoving(false);
    }
  };

  // Remaining JSX for the page component...
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Manage Students</CardTitle>
            <CardDescription>{translate("studentManagementPageDescClassified")}</CardDescription>
            {!activeAcademicYear && !loadingData && (
                <div className="mt-2 text-red-600 border border-red-300 bg-red-50 p-2 rounded-md">
                    <p>{error}</p>
                    <Button variant="link" asChild className="p-0 h-auto">
                        <Link href="/admin/settings">Go to Settings</Link>
                    </Button>
                </div>
            )}
          </div>
          <div className="flex gap-2">
             <Button size="sm" className="gap-1" onClick={() => setIsImportDialogOpen(true)} disabled={!activeAcademicYear}>
              <Upload className="h-4 w-4" /> {translate("studentImportButtonTitle")}
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) reset(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1" disabled={!activeAcademicYear}>
                  <PlusCircle className="h-4 w-4" /> {translate("studentManagementAddStudentButton")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{translate("studentManagementAddDialogTitle")}</DialogTitle>
                  <DialogDescription>{translate("studentManagementAddDialogDesc")}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onAddSubmit)} className="grid gap-4 py-4">
                    <div className="space-y-1">
                        <Label htmlFor="add-name">Name</Label>
                        <Input id="add-name" {...register("name")} className={errors.name ? 'border-destructive' : ''} />
                        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="add-id">{translate("studentManagementStudentInfoLabel")}</Label>
                        <Input id="add-id" {...register("studentIdInfo")} placeholder={translate("studentManagementStudentInfoPlaceholder")} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="add-avatar">Avatar URL</Label>
                        <Input id="add-avatar" {...register("avatarUrl")} className={errors.avatarUrl ? 'border-destructive' : ''} placeholder="https://example.com/image.png"/>
                        {errors.avatarUrl && <p className="text-xs text-destructive mt-1">{errors.avatarUrl.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="add-classId">{translate("studentManagementAssignToClassLabel")}</Label>
                        <Controller
                            control={control}
                            name="classId"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || ''} disabled={allClasses.length === 0}>
                                    <SelectTrigger id="add-classId">
                                        <SelectValue placeholder={translate("studentManagementSelectClassOptionalPlaceholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none_class_option">{translate("studentManagementNoneOption")}</SelectItem>
                                        {allClasses.map(cls => (
                                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">{translate("cancelButton")}</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Student</Button>
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
          ) : !activeAcademicYear ? (
              <p className="text-center text-muted-foreground py-8">
                  Student management requires an active academic year.
              </p>
          ) : (
            <>
            <div className="flex items-center gap-2 mb-4">
                <Button size="sm" variant="outline" disabled={selectedStudents.size === 0} onClick={() => setIsMoveDialogOpen(true)}>
                    <Move className="mr-2 h-4 w-4"/> {translate("moveSelectedWithCount", {count: selectedStudents.size.toString()})}
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={selectedStudents.size === 0}>
                            <Trash2 className="mr-2 h-4 w-4"/> {translate("deleteSelectedWithCount", {count: selectedStudents.size.toString()})}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{translate("studentDeleteConfirmTitleMultiple", {count: selectedStudents.size.toString()})}</AlertDialogTitle>
                            <AlertDialogDescription>{translate("studentDeleteConfirmDescMultiple", {count: selectedStudents.size.toString()})}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting}>
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <Accordion type="multiple" className="w-full" defaultValue={allClasses.map(c => c.id).concat('unassigned')}>
              {allClasses.map(cls => (
                <AccordionItem value={cls.id} key={cls.id}>
                  <AccordionTrigger>{cls.name} ({groupedStudents.byClass[cls.id]?.length || 0} {translate("students")})</AccordionTrigger>
                  <AccordionContent>
                    {groupedStudents.byClass[cls.id]?.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]"><Checkbox onCheckedChange={checked => {
                                const classStudentIds = groupedStudents.byClass[cls.id].map(s => s.id);
                                setSelectedStudents(prev => {
                                    const newSet = new Set(prev);
                                    if(checked) classStudentIds.forEach(id => newSet.add(id));
                                    else classStudentIds.forEach(id => newSet.delete(id));
                                    return newSet;
                                });
                            }}
                            checked={groupedStudents.byClass[cls.id].every(s => selectedStudents.has(s.id))}
                            /></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Student ID</TableHead>
                             <TableHead className="text-right">{translate("actionsLabel")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedStudents.byClass[cls.id].map(student => (
                            <TableRow key={student.id}>
                               <TableCell><Checkbox checked={selectedStudents.has(student.id)} onCheckedChange={() => {
                                    setSelectedStudents(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(student.id)) newSet.delete(student.id);
                                        else newSet.add(student.id);
                                        return newSet;
                                    })
                               }}/>
                               </TableCell>
                              <TableCell className="font-medium flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={student.avatarUrl} alt={student.name} />
                                  <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                </Avatar>
                                {student.name}
                              </TableCell>
                              <TableCell>{student.studentIdInfo || 'N/A'}</TableCell>
                               <TableCell className="text-right">
                                  <Button variant="outline" size="sm" onClick={() => handleOpenEditAvatarDialog(student)} className="gap-1">
                                    <ImageIcon className="h-3 w-3"/> {translate("studentManagementEditAvatarButton")}
                                  </Button>
                               </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : <p className="text-muted-foreground text-center p-4">{translate("studentManagementNoStudentsInClass")}</p>}
                  </AccordionContent>
                </AccordionItem>
              ))}
               <AccordionItem value="unassigned">
                  <AccordionTrigger>{translate("unassignedStudentsTitle")} ({groupedStudents.unassigned.length || 0})</AccordionTrigger>
                  <AccordionContent>
                     {groupedStudents.unassigned.length > 0 ? (
                       <Table>
                         <TableHeader>
                           <TableRow>
                            <TableHead className="w-[50px]"><Checkbox onCheckedChange={checked => {
                                const unassignedStudentIds = groupedStudents.unassigned.map(s => s.id);
                                setSelectedStudents(prev => {
                                    const newSet = new Set(prev);
                                    if(checked) unassignedStudentIds.forEach(id => newSet.add(id));
                                    else unassignedStudentIds.forEach(id => newSet.delete(id));
                                    return newSet;
                                });
                            }}
                            checked={groupedStudents.unassigned.every(s => selectedStudents.has(s.id))}
                            /></TableHead>
                             <TableHead>Name</TableHead>
                             <TableHead>Student ID</TableHead>
                             <TableHead className="text-right">{translate("actionsLabel")}</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {groupedStudents.unassigned.map(student => (
                            <TableRow key={student.id}>
                                <TableCell><Checkbox checked={selectedStudents.has(student.id)} onCheckedChange={() => {
                                        setSelectedStudents(prev => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(student.id)) newSet.delete(student.id);
                                            else newSet.add(student.id);
                                            return newSet;
                                        })
                                   }}/>
                                </TableCell>
                               <TableCell className="font-medium flex items-center gap-2">
                                 <Avatar className="h-8 w-8">
                                   <AvatarImage src={student.avatarUrl} alt={student.name} />
                                   <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                 </Avatar>
                                 {student.name}
                               </TableCell>
                               <TableCell>{student.studentIdInfo || 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                   <Button variant="outline" size="sm" onClick={() => handleOpenEditAvatarDialog(student)} className="gap-1">
                                     <ImageIcon className="h-3 w-3"/> {translate("studentManagementEditAvatarButton")}
                                   </Button>
                                </TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                     ) : <p className="text-muted-foreground text-center p-4">No unassigned students.</p>}
                  </AccordionContent>
                </AccordionItem>
            </Accordion>
            </>
          )}
        </CardContent>
      </Card>

      <StudentImportDialog
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        adminSchoolId={adminSchoolId}
        onImportSuccess={() => {
          setIsImportDialogOpen(false);
          fetchData();
        }}
        allClasses={allClasses}
        activeAcademicYear={activeAcademicYear}
      />

      <Dialog open={isEditAvatarDialogOpen} onOpenChange={setIsEditAvatarDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{translate("studentManagementEditAvatarDialogTitle", { name: currentEditingStudent?.name || '' })}</DialogTitle>
                <DialogDescription>{translate("studentManagementEditAvatarDialogDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
                <Label htmlFor="edit-avatar-url">New Avatar URL</Label>
                <Input id="edit-avatar-url" value={newAvatarUrl} onChange={e => setNewAvatarUrl(e.target.value)} placeholder="https://example.com/image.png"/>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditAvatarDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateAvatar} disabled={isSubmittingAvatar}>
                    {isSubmittingAvatar && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {translate("studentManagementSaveAvatarButton")}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
        <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{translate("studentMoveDialogTitle", {count: selectedStudents.size.toString()})}</DialogTitle>
                <DialogDescription>{translate("studentMoveDialogDesc")}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="move-class-select">{translate("studentMoveSelectClassLabel")}</Label>
                <Select value={targetClassId} onValueChange={setTargetClassId}>
                    <SelectTrigger id="move-class-select">
                        <SelectValue placeholder="Select a target class..."/>
                    </SelectTrigger>
                    <SelectContent>
                        {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleMoveSelectedStudents} disabled={isMoving || !targetClassId}>
                    {isMoving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {translate("studentMoveConfirmButton")}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
