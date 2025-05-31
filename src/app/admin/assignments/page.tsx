
// src/app/admin/assignments/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, UserX, Link as LinkIcon, Unlink, BookUser, ChevronDown } from "lucide-react"; 
import type { Teacher, Parent, Student, Class } from "@/lib/types";

type SelectItemType = { id: string; name: string; };

export default function AssignmentsPage() {
  const { user: authUser, schoolId: adminSchoolId, loading: authLoading } = useAuth();
  const [teachers, setTeachers] = useState<SelectItemType[]>([]);
  const [parents, setParents] = useState<SelectItemType[]>([]);
  const [students, setStudents] = useState<SelectItemType[]>([]);
  const [classes, setClasses] = useState<SelectItemType[]>([]);
  const [loading, setLoading] = useState({ teachers: true, parents: true, students: true, classes: true });
  const [error, setError] = useState<string | null>(null);

  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedClassForTeacher, setSelectedClassForTeacher] = useState<string>('');
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [selectedStudentForParent, setSelectedStudentForParent] = useState<string>('');
  
  const [selectedStudentsForClass, setSelectedStudentsForClass] = useState<string[]>([]);
  const [selectedClassForStudent, setSelectedClassForStudent] = useState<string>('');

  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);
  const [isSubmittingParent, setIsSubmittingParent] = useState(false);
  const [isSubmittingStudentToClass, setIsSubmittingStudentToClass] = useState(false);

  const { toast } = useToast();

  const fetchData = async (
    collectionName: string, 
    role: 'Teacher' | 'Parent' | 'Student' | null, 
    setData: React.Dispatch<React.SetStateAction<SelectItemType[]>>, 
    loadingKey: keyof typeof loading
  ) => {
    if (!adminSchoolId && collectionName !== 'users' && role !== 'Parent') { // Parents are global for now
        setLoading(prev => ({ ...prev, [loadingKey]: false }));
        setError(`Admin school ID missing, cannot load ${collectionName}.`);
        return;
    }
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    try {
      let q;
      if (role) { // Teachers and Students are school-specific
        if (role === 'Parent') { // Parents are currently fetched globally
            q = query(collection(db, "users"), where("role", "==", role));
        } else {
            q = query(collection(db, "users"), where("role", "==", role), where("schoolId", "==", adminSchoolId));
        }
      } else { // Classes are school-specific
        q = query(collection(db, collectionName), where("schoolId", "==", adminSchoolId));
      }
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || `Unnamed ${collectionName.slice(0, -1)} (${doc.id.substring(0, 4)})`,
      }));
      setData(items);
    } catch (err) {
      console.error(`Error fetching ${collectionName}:`, err);
      setError(`Failed to load ${collectionName}.`);
      toast({ variant: "destructive", title: "Error", description: `Failed to load ${collectionName}.` });
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  useEffect(() => {
    if (authLoading || (!adminSchoolId && !authUser) ) return; // Wait for auth and schoolId
    
    // Only fetch if adminSchoolId is present for school-specific data
    if (adminSchoolId) {
        fetchData("users", "Teacher", setTeachers, 'teachers');
        fetchData("users", "Student", setStudents, 'students');
        fetchData("classes", null, setClasses, 'classes');
    }
    fetchData("users", "Parent", setParents, 'parents'); // Parents are global for now
  }, [adminSchoolId, authLoading, authUser]);

  const handleAssignTeacherToClass = async () => {
    if (!selectedTeacher || !selectedClassForTeacher || !adminSchoolId) {
      toast({ variant: "destructive", title: "Error", description: "Please select teacher, class, and ensure admin context." });
      return;
    }
    setIsSubmittingTeacher(true);
    try {
      // Verify teacher and class belong to the admin's school
      const teacherDoc = await getDoc(doc(db, "users", selectedTeacher));
      const classDoc = await getDoc(doc(db, "classes", selectedClassForTeacher));
      if (!teacherDoc.exists() || teacherDoc.data()?.schoolId !== adminSchoolId || !classDoc.exists() || classDoc.data()?.schoolId !== adminSchoolId) {
        toast({ variant: "destructive", title: "Error", description: "Teacher or class not found or does not belong to your school." });
        setIsSubmittingTeacher(false);
        return;
      }

      const classRef = doc(db, "classes", selectedClassForTeacher);
      await updateDoc(classRef, { teacherId: selectedTeacher });
      const teacherRef = doc(db, "users", selectedTeacher);
      await updateDoc(teacherRef, { assignedClassIds: arrayUnion(selectedClassForTeacher) });
      toast({ title: "Success", description: "Teacher assigned to class successfully." });
    } catch (err) {
      console.error("Error assigning teacher:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to assign teacher to class." });
    } finally {
      setIsSubmittingTeacher(false);
    }
  };

  const handleUnassignTeacherFromClass = async () => {
     if (!selectedTeacher || !selectedClassForTeacher || !adminSchoolId) {
      toast({ variant: "destructive", title: "Error", description: "Please select teacher, class, and ensure admin context." });
      return;
    }
    setIsSubmittingTeacher(true);
    try {
      const teacherDoc = await getDoc(doc(db, "users", selectedTeacher));
      const classDoc = await getDoc(doc(db, "classes", selectedClassForTeacher));
      if (!teacherDoc.exists() || teacherDoc.data()?.schoolId !== adminSchoolId || !classDoc.exists() || classDoc.data()?.schoolId !== adminSchoolId) {
        toast({ variant: "destructive", title: "Error", description: "Teacher or class not found or does not belong to your school." });
        setIsSubmittingTeacher(false);
        return;
      }

      const classRef = doc(db, "classes", selectedClassForTeacher);
      await updateDoc(classRef, { teacherId: null });
      const teacherRef = doc(db, "users", selectedTeacher);
      await updateDoc(teacherRef, { assignedClassIds: arrayRemove(selectedClassForTeacher) });
      toast({ title: "Success", description: "Teacher unassigned from class successfully." });
    } catch (err) {
      console.error("Error unassigning teacher:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to unassign teacher from class." });
    } finally {
      setIsSubmittingTeacher(false);
    }
  };

  const handleLinkParentToStudent = async () => {
    if (!selectedParent || !selectedStudentForParent || !adminSchoolId) {
      toast({ variant: "destructive", title: "Error", description: "Please select parent, student, and ensure admin context." });
      return;
    }
    setIsSubmittingParent(true);
    try {
      // Verify student belongs to the admin's school
      const studentDoc = await getDoc(doc(db, "users", selectedStudentForParent));
      if (!studentDoc.exists() || studentDoc.data()?.schoolId !== adminSchoolId) {
        toast({ variant: "destructive", title: "Error", description: "Student not found or does not belong to your school." });
        setIsSubmittingParent(false);
        return;
      }

      const parentRef = doc(db, "users", selectedParent);
      await updateDoc(parentRef, { childIds: arrayUnion(selectedStudentForParent) });
      const studentRef = doc(db, "users", selectedStudentForParent);
      await updateDoc(studentRef, { parentIds: arrayUnion(selectedParent) });
      toast({ title: "Success", description: "Parent linked to student successfully." });
    } catch (err) {
      console.error("Error linking parent:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to link parent to student." });
    } finally {
      setIsSubmittingParent(false);
    }
  };

  const handleUnlinkParentFromStudent = async () => {
    if (!selectedParent || !selectedStudentForParent || !adminSchoolId) {
      toast({ variant: "destructive", title: "Error", description: "Please select parent, student, and ensure admin context." });
      return;
    }
    setIsSubmittingParent(true);
    try {
       const studentDoc = await getDoc(doc(db, "users", selectedStudentForParent));
       if (!studentDoc.exists() || studentDoc.data()?.schoolId !== adminSchoolId) {
         toast({ variant: "destructive", title: "Error", description: "Student not found or does not belong to your school." });
         setIsSubmittingParent(false);
         return;
       }

      const parentRef = doc(db, "users", selectedParent);
      await updateDoc(parentRef, { childIds: arrayRemove(selectedStudentForParent) });
      const studentRef = doc(db, "users", selectedStudentForParent);
      await updateDoc(studentRef, { parentIds: arrayRemove(selectedParent) });
      toast({ title: "Success", description: "Parent unlinked from student successfully." });
    } catch (err) {
      console.error("Error unlinking parent:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to unlink parent from student." });
    } finally {
      setIsSubmittingParent(false);
    }
  };

  const handleAssignStudentToClass = async () => {
    if (selectedStudentsForClass.length === 0 || !selectedClassForStudent || !adminSchoolId) {
      toast({ variant: "destructive", title: "Error", description: "Please select student(s), class, and ensure admin context." });
      return;
    }
    setIsSubmittingStudentToClass(true);
    try {
      // Verify class belongs to the admin's school
      const classDoc = await getDoc(doc(db, "classes", selectedClassForStudent));
      if (!classDoc.exists() || classDoc.data()?.schoolId !== adminSchoolId) {
        toast({ variant: "destructive", title: "Error", description: "Class not found or does not belong to your school." });
        setIsSubmittingStudentToClass(false);
        return;
      }
      
      // Verify all students belong to the admin's school
      for (const studentId of selectedStudentsForClass) {
        const studentDoc = await getDoc(doc(db, "users", studentId));
        if (!studentDoc.exists() || studentDoc.data()?.schoolId !== adminSchoolId) {
          toast({ variant: "destructive", title: "Error", description: `Student ${studentId} not found or does not belong to your school.` });
          setIsSubmittingStudentToClass(false);
          return;
        }
      }

      const classRef = doc(db, "classes", selectedClassForStudent);
      await updateDoc(classRef, { studentIds: arrayUnion(...selectedStudentsForClass) });

      const studentUpdatePromises = selectedStudentsForClass.map(studentId => {
        const studentRef = doc(db, "users", studentId);
        return updateDoc(studentRef, { classIds: arrayUnion(selectedClassForStudent) });
      });
      await Promise.all(studentUpdatePromises);

      toast({ title: "Success", description: "Selected students assigned to class successfully." });
      setSelectedStudentsForClass([]); 
    } catch (err) {
      console.error("Error assigning student to class:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to assign student(s) to class." });
    } finally {
      setIsSubmittingStudentToClass(false);
    }
  };

  const handleUnassignStudentFromClass = async () => {
    if (selectedStudentsForClass.length === 0 || !selectedClassForStudent || !adminSchoolId) {
      toast({ variant: "destructive", title: "Error", description: "Please select student(s), class, and ensure admin context." });
      return;
    }
    setIsSubmittingStudentToClass(true);
    try {
      const classDoc = await getDoc(doc(db, "classes", selectedClassForStudent));
      if (!classDoc.exists() || classDoc.data()?.schoolId !== adminSchoolId) {
        toast({ variant: "destructive", title: "Error", description: "Class not found or does not belong to your school." });
        setIsSubmittingStudentToClass(false);
        return;
      }
       for (const studentId of selectedStudentsForClass) {
        const studentDoc = await getDoc(doc(db, "users", studentId));
        if (!studentDoc.exists() || studentDoc.data()?.schoolId !== adminSchoolId) {
          toast({ variant: "destructive", title: "Error", description: `Student ${studentId} not found or does not belong to your school.` });
          setIsSubmittingStudentToClass(false);
          return;
        }
      }

      const classRef = doc(db, "classes", selectedClassForStudent);
      await updateDoc(classRef, { studentIds: arrayRemove(...selectedStudentsForClass) });

      const studentUpdatePromises = selectedStudentsForClass.map(studentId => {
        const studentRef = doc(db, "users", studentId);
        return updateDoc(studentRef, { classIds: arrayRemove(selectedClassForStudent) });
      });
      await Promise.all(studentUpdatePromises);

      toast({ title: "Success", description: "Selected students unassigned from class successfully." });
      setSelectedStudentsForClass([]); 
    } catch (err) {
      console.error("Error unassigning student from class:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to unassign student(s) from class." });
    } finally {
      setIsSubmittingStudentToClass(false);
    }
  };

  const handleStudentSelectionChange = (studentId: string) => {
    setSelectedStudentsForClass(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const isLoading = loading.teachers || loading.parents || loading.students || loading.classes || authLoading;
  if (!adminSchoolId && !authLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Assignments Unavailable</CardTitle></CardHeader>
        <CardContent><p>Admin school context is missing. Cannot manage assignments.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Assign Teacher to Class</CardTitle>
          <CardDescription>Select a teacher and the class they will manage within your school.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-select">Teacher</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher} disabled={loading.teachers}>
                <SelectTrigger id="teacher-select">
                  <SelectValue placeholder={loading.teachers ? "Loading..." : "Select Teacher"} />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="class-select-teacher">Class</Label>
              <Select value={selectedClassForTeacher} onValueChange={setSelectedClassForTeacher} disabled={loading.classes}>
                <SelectTrigger id="class-select-teacher">
                  <SelectValue placeholder={loading.classes ? "Loading..." : "Select Class"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
            <Button variant="outline" onClick={handleUnassignTeacherFromClass} disabled={isSubmittingTeacher || isLoading}>
              {isSubmittingTeacher && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserX className="mr-2 h-4 w-4" /> Unassign
            </Button>
          <Button onClick={handleAssignTeacherToClass} disabled={isSubmittingTeacher || isLoading}>
            {isSubmittingTeacher && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <UserCheck className="mr-2 h-4 w-4" /> Assign
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Link Parent to Student</CardTitle>
          <CardDescription>Connect a parent account to their child's student record (student must be in your school).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
           <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parent-select">Parent</Label>
              <Select value={selectedParent} onValueChange={setSelectedParent} disabled={loading.parents}>
                <SelectTrigger id="parent-select">
                  <SelectValue placeholder={loading.parents ? "Loading..." : "Select Parent"} />
                </SelectTrigger>
                <SelectContent>
                  {parents.map(parent => (
                    <SelectItem key={parent.id} value={parent.id}>{parent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="student-select-parent">Student (Your School)</Label>
              <Select value={selectedStudentForParent} onValueChange={setSelectedStudentForParent} disabled={loading.students}>
                <SelectTrigger id="student-select-parent">
                  <SelectValue placeholder={loading.students ? "Loading..." : "Select Student"} />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
            <Button variant="outline" onClick={handleUnlinkParentFromStudent} disabled={isSubmittingParent || isLoading}>
                {isSubmittingParent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Unlink className="mr-2 h-4 w-4"/> Unlink
            </Button>
          <Button onClick={handleLinkParentToStudent} disabled={isSubmittingParent || isLoading}>
            {isSubmittingParent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             <LinkIcon className="mr-2 h-4 w-4" /> Link
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign Students to Class</CardTitle>
          <CardDescription>Add one or more students from your school to a class roster.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-multi-select-class">Students (Your School)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={loading.students}
                  >
                    {selectedStudentsForClass.length > 0
                      ? `${selectedStudentsForClass.length} student(s) selected`
                      : (loading.students ? "Loading..." : "Select Students...")}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <ScrollArea className="h-72">
                    {students.map((student) => (
                      <div key={student.id} className="flex items-center space-x-2 p-2 hover:bg-accent">
                        <Checkbox
                          id={`student-${student.id}`}
                          checked={selectedStudentsForClass.includes(student.id)}
                          onCheckedChange={() => handleStudentSelectionChange(student.id)}
                        />
                        <Label htmlFor={`student-${student.id}`} className="font-normal cursor-pointer flex-1">
                          {student.name}
                        </Label>
                      </div>
                    ))}
                    {students.length === 0 && !loading.students && <p className="p-2 text-sm text-muted-foreground">No students available in your school.</p>}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-select-student">Class (Your School)</Label>
              <Select value={selectedClassForStudent} onValueChange={setSelectedClassForStudent} disabled={loading.classes}>
                <SelectTrigger id="class-select-student">
                  <SelectValue placeholder={loading.classes ? "Loading..." : "Select Class"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
           <Button variant="outline" onClick={handleUnassignStudentFromClass} disabled={isSubmittingStudentToClass || isLoading}>
             {isSubmittingStudentToClass && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             <UserX className="mr-2 h-4 w-4" /> Unassign
           </Button>
          <Button onClick={handleAssignStudentToClass} disabled={isSubmittingStudentToClass || isLoading}>
            {isSubmittingStudentToClass && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <BookUser className="mr-2 h-4 w-4" /> Assign Student(s)
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Card className="lg:col-span-2 xl:col-span-3 border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
