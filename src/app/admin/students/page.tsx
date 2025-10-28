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
import { Loader2, PlusCircle, Edit, Image as ImageIcon, Upload, Trash2, Users, Move, PhoneCall } from "lucide-react";
import type { Student, UserProfile, Class, AcademicYear } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StudentImportDialog } from "./_components/StudentImportDialog"; 
import { useLanguage } from "@/contexts/LanguageContext";
import { Checkbox } from "@/components/ui/checkbox";

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
};

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
  
  // State for move dialog
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [targetClassId, setTargetClassId] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [isCalling, setIsCalling] = useState<Record<string, boolean>>({});

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
      // Fetch Active Academic Year
      const academicYearQuery = query(collection(db, "academicYears"), where("schoolId", "==", adminSchoolId), where("isActive", "==", true));
      const academicYearSnapshot = await getDocs(academicYearQuery);
      if (academicYearSnapshot.empty) {
        setError("No active academic year found. Please set one in the settings.");
        setLoadingData(false);
        return;
      }
      const yearDoc = academicYearSnapshot.docs[0];
      const yearData = { id: yearDoc.id, ...yearDoc.data() } as AcademicYear;
      setActiveAcademicYear(yearData);


      const studentsQuery = query(collection(db, "users"), where("role", "==", "Student"), where("schoolId", "==", adminSchoolId));
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

      const classesQuery = query(collection(db, "classes"), where("schoolId", "==", adminSchoolId));
      const classesSnapshot = await getDocs(classesQuery);
      const classListItems = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
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

    if (!activeAcademicYear?.activeTermId) {
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
        studentIds.forEach(id => enrolledStudentsThisTerm.add(id));
    });

    allStudents.forEach(student => {
        let assignedInTerm = false;
        for (const classId in activeTerm.studentEnrollments) {
            if (activeTerm.studentEnrollments[classId].includes(student.id)) {
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
        batch.update(yearDocRef, {
            [fieldToUpdate]: arrayUnion(studentDocRef.id)
        });
      }
      
      await batch.commit();
      
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
            if(activeTerm) {
                const enrollmentUpdates: Record<string, any> = {};
                Object.entries(activeTerm.studentEnrollments).forEach(([classId, studentIdsInClass]) => {
                    const studentsToRemove = studentIdsInClass.filter(id => selectedStudents.has(id));
                    if(studentsToRemove.length > 0) {
                        enrollmentUpdates[`terms.${activeTerm.id}.studentEnrollments.${classId}`] = arrayRemove(...studentsToRemove);
                    }
                });
                if(Object.keys(enrollmentUpdates).length > 0) {
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

        // 1. Remove students from their old class enrollments in the current term
        const removalUpdates: Record<string, any> = {};
        Object.entries(activeTerm.studentEnrollments).forEach(([classId, studentIdsInClass]) => {
             const studentsToRemove = studentIdsInClass.filter(id => studentIdsToMove.includes(id));
             if (studentsToRemove.length > 0) {
                 removalUpdates[`terms.${activeTerm.id}.studentEnrollments.${classId}`] = arrayRemove(...studentsToRemove);
             }
        });
        if(Object.keys(removalUpdates).length > 0) {
            batch.update(yearRef, removalUpdates);
        }

        // 2. Add students to the new class enrollment for the current term
        const fieldToUpdate = `terms.${activeTerm.id}.studentEnrollments.${targetClassId}`;
        batch.update(yearRef, {
            [fieldToUpdate]: arrayUnion(...studentIdsToMove)
        });

        // 3. Commit all changes
        await batch.commit();

        toast({ title: translate("studentMoveSuccessTitle"), description: translate("studentMoveSuccessDesc", { count: studentIdsToMove.length.toString() }) });
      
        // 4. Reset state and refresh data
        fetchData();
        setSelectedStudents(new Set());
        setIsMoveDialogOpen(false);
        setTargetClassId('');

    } catch (err: any) {
      console.error("Error moving students:", err);
      toast({ variant: "destructive", title: "Error", description: translate("studentMoveErrorGeneral") });
    } finally {
      setIsMoving(false);
    }
  };

  const handleViewParents = async (student: StudentDisplay) => {
    if (!student.parentIds || student.parentIds.length === 0) {
        toast({ title: translate("noLinkedParentsTitle"), description: translate("noLinkedParentsDesc") });
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
  
  const toggleSelectAll = (studentIds: string[], isSelected: boolean) => {
      setSelectedStudents(prev => {
          const newSet = new Set(prev);
          if (isSelected) {
              studentIds.forEach(id => newSet.add(id));
          } else {
              studentIds.forEach(id => newSet.delete(id));
          }
          return newSet;
      });
  };

  const renderStudentTable = (studentsToRender: StudentDisplay[]) => {
      const allInGroupSelected = studentsToRender.length > 0 && studentsToRender.every(s => selectedStudents.has(s.id));
      const someInGroupSelected = studentsToRender.some(s => selectedStudents.has(s.id));

      return (
    <div className="border rounded-md mt-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
                <Checkbox
                    checked={allInGroupSelected}
                    onCheckedChange={(checked) => toggleSelectAll(studentsToRender.map(s => s.id), checked as boolean)}
                    aria-label="Select all students in this group"
                    data-state={someInGroupSelected && !allInGroupSelected ? "indeterminate" : (allInGroupSelected ? "checked" : "unchecked")}
                />
            </TableHead>
            <TableHead className="w-[80px]">Avatar</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Student ID</TableHead>
            <TableHead>Linked Parents</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studentsToRender.length > 0 ? (
            studentsToRender.map((student) => (
              <TableRow key={student.id} data-state={selectedStudents.has(student.id) ? "selected" : ""}>
                <TableCell>
                    <Checkbox
                        checked={selectedStudents.has(student.id)}
                        onCheckedChange={(checked) => {
                            setSelectedStudents(prev => {
                                const newSet = new Set(prev);
                                if (checked) newSet.add(student.id);
                                else newSet.delete(student.id);
                                return newSet;
                            });
                        }}
                        aria-label={`Select student ${student.name}`}
                    />
                </TableCell>
                <TableCell>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.avatarUrl || undefined} alt={student.name} />
                    <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>{student.studentIdInfo || 'N/A'}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => handleViewParents(student)} className="gap-1" disabled={!student.parentIds || student.parentIds.length === 0}>
                    <Users className="h-4 w-4" /> {student.parentIds?.length || 0}
                  </Button>
                </TableCell>
                <TableCell className="text-right space-x-2">
                   <Button variant="outline" size="sm" onClick={() => handleOpenEditAvatarDialog(student)} className="gap-1">
                      <ImageIcon className="h-3 w-3" /> Edit Avatar
                   </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No students in this group for the current term.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    )
  };


  if (authLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
   if (error) {
    return <p className="text-center text-destructive">{error}</p>
  }

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>{translate("manageStudents")}</CardTitle>
            <CardDescription>{translate("studentManagementPageDescClassified") || "View students grouped by class, add new students, or import them."}</CardDescription>
             {activeAcademicYear && <p className="text-sm text-primary pt-1">Current Term: {activeAcademicYear.name} - {activeAcademicYear.terms.find(t=>t.id === activeAcademicYear.activeTermId)?.name}</p>}
        </div>
        <div className="flex gap-2">
            <Button size="sm" className="gap-1" onClick={() => setIsImportDialogOpen(true)} disabled={!adminSchoolId || !activeAcademicYear}>
                <Upload className="h-4 w-4" />
                {translate("studentImportButtonTitle")}
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) reset(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1" disabled={!adminSchoolId || !activeAcademicYear}>
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
                      <Label htmlFor="name" className="text-right">Name</Label>
                      <div className="col-span-3">
                          <Input id="name" {...register("name")} className={errors.name ? 'border-destructive' : ''} />
                          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                      </div>
                   </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="studentIdInfo" className="text-right">Student ID</Label>
                       <div className="col-span-3">
                          <Input id="studentIdInfo" {...register("studentIdInfo")} placeholder="e.g., Roll No, Admission ID"/>
                      </div>
                   </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="avatarUrl" className="text-right">Avatar URL</Label>
                       <div className="col-span-3">
                          <Input id="avatarUrl" {...register("avatarUrl")} className={errors.avatarUrl ? 'border-destructive' : ''} placeholder="https://example.com/avatar.png"/>
                          {errors.avatarUrl && <p className="text-xs text-destructive mt-1">{errors.avatarUrl.message}</p>}
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
                                      value={field.value || 'none_class_option'}
                                      disabled={loadingData || allClasses.length === 0}
                                  >
                                      <SelectTrigger id="classId">
                                          <SelectValue placeholder={loadingData ? "Loading..." : "Select Class (Optional)"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="none_class_option">None</SelectItem>
                                          {allClasses.map(cls => (
                                              <SelectItem key={cls.id} value={cls.id}>
                                                  {cls.name}
                                              </SelectItem>
                                          ))}
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
                      <Button type="submit" disabled={isSubmitting || loadingData}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Add Student
                      </Button>
                   </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
         <div className="flex items-center gap-4 p-4 border-t">
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={selectedStudents.size === 0 || isDeleting}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {translate("deleteSelectedWithCount", { count: selectedStudents.size.toString() })}
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>{translate("studentDeleteConfirmTitleMultiple", { count: selectedStudents.size.toString() })}</AlertDialogTitle>
                          <AlertDialogDescription>
                              {translate("studentDeleteConfirmDescMultiple", { count: selectedStudents.size.toString() })}
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting}>
                              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Delete
                          </AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
              <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={selectedStudents.size === 0}>
                        <Move className="mr-2 h-4 w-4" />
                        {translate("moveSelectedWithCount", { count: selectedStudents.size.toString() })}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{translate("studentMoveDialogTitle", { count: selectedStudents.size.toString() })}</DialogTitle>
                        <DialogDescription>{translate("studentMoveDialogDesc")}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="target-class-select">{translate("studentMoveSelectClassLabel")}</Label>
                        <Select value={targetClassId} onValueChange={setTargetClassId}>
                            <SelectTrigger id="target-class-select">
                                <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                            <SelectContent>
                                {allClasses.map(cls => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                        {cls.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleMoveSelectedStudents} disabled={isMoving || !targetClassId}>
                            {isMoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {translate("studentMoveConfirmButton")}
                        </Button>
                    </DialogFooter>
                  </DialogContent>
              </Dialog>
          </div>
        {loadingData ? (
           <div className="flex justify-center items-center py-10">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             <span className="ml-2">{translate("studentManagementLoadingStudents")}</span>
           </div>
         ) : !adminSchoolId ? (
            <p className="text-center text-destructive">{translate("studentManagementErrorNoSchoolId")}</p>
         ) : !activeAcademicYear ? (
            <p className="text-center text-destructive">No active academic year. Please configure one in Settings.</p>
         ) : (
            allClasses.length === 0 && groupedStudents.unassigned.length === 0 ? (
                 <p className="text-center text-muted-foreground py-10">{translate("studentManagementNoStudentsFound")}</p>
            ) : (
            <Accordion type="multiple" className="w-full" defaultValue={allClasses.map(c => c.id).concat("unassigned-students")}>
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
        activeAcademicYear={activeAcademicYear}
    />

    <Dialog open={isEditAvatarDialogOpen} onOpenChange={(open) => {
        setIsEditAvatarDialogOpen(open);
        if (!open) { setCurrentEditingStudent(null); setNewAvatarUrl("");}
    }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>{translate("studentManagementEditAvatarDialogTitle", {name: currentEditingStudent?.name || ''})}</DialogTitle>
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
                    <Label htmlFor="edit-avatarUrl" className="text-right">Avatar URL</Label>
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
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
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
          <DialogTitle>{translate("parentDetailsForStudent", {studentName: selectedStudentForParents?.name || "Student"})}</DialogTitle>
          <DialogDescription>{translate("listOfLinkedParentsDesc")}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {loadingParentDetails ? (
            <div className="flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">{translate("loadingParentDetails")}</span>
            </div>
          ) : linkedParentsDetails.length > 0 ? (
            <ul className="space-y-3">
              {linkedParentsDetails.map(parent => (
                <li key={parent.uid} className="flex items-center gap-4 p-2 border rounded-md">
                  <Avatar>
                    <AvatarImage src={parent.avatarUrl} alt={parent.name} />
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
            <p className="text-center text-muted-foreground">{translate("noLinkedParents")}</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">{translate("closeButton")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
