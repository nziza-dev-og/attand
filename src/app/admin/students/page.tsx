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
import { Loader2, PlusCircle, Edit, Image as ImageIcon, Upload, Trash2, Users, Move, PhoneCall, Settings } from "lucide-react";
import type { Student, UserProfile, Class, AcademicYear } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StudentImportDialog } from "./_components/StudentImportDialog"; 
import { useLanguage } from "@/contexts/LanguageContext";
import { Checkbox } from "@/components/ui/checkbox";
import Link from 'next/link';

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
        setError("No active academic year found. Please create and activate one in the school settings to manage student enrollments.");
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

    } catch (err: any