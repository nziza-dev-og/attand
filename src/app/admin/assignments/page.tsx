// src/app/admin/assignments/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, UserX, Link as LinkIcon, Unlink } from "lucide-react"; // LinkIcon imported as alias
import type { Teacher, Parent, Student, Class } from "@/lib/types";

// Fetchable item types
type SelectItemType = { id: string; name: string; };

export default function AssignmentsPage() {
  const [teachers, setTeachers] = useState<SelectItemType[]>([]);
  const [parents, setParents] = useState<SelectItemType[]>([]);
  const [students, setStudents] = useState<SelectItemType[]>([]);
  const [classes, setClasses] = useState<SelectItemType[]>([]);
  const [loading, setLoading] = useState({ teachers: true, parents: true, students: true, classes: true });
  const [error, setError] = useState<string | null>(null);

  // State for assignment forms - Initialize with 'none' or a placeholder value instead of ''
  const [selectedTeacher, setSelectedTeacher] = useState<string>(''); // Keep empty for controlled component
  const [selectedClassForTeacher, setSelectedClassForTeacher] = useState<string>(''); // Keep empty for controlled component
  const [selectedParent, setSelectedParent] = useState<string>(''); // Keep empty for controlled component
  const [selectedStudentForParent, setSelectedStudentForParent] = useState<string>(''); // Keep empty for controlled component

  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);
  const [isSubmittingParent, setIsSubmittingParent] = useState(false);

  const { toast } = useToast();

  // Generic fetch function
  const fetchData = async (collectionName: string, role: 'Teacher' | 'Parent' | 'Student' | null, setData: React.Dispatch<React.SetStateAction<SelectItemType[]>>, loadingKey: keyof typeof loading) => {
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    try {
      let q;
      if (role) {
        q = query(collection(db, "users"), where("role", "==", role));
      } else {
        q = query(collection(db, collectionName)); // For 'classes'
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
    fetchData("users", "Teacher", setTeachers, 'teachers');
    fetchData("users", "Parent", setParents, 'parents');
    fetchData("users", "Student", setStudents, 'students');
    fetchData("classes", null, setClasses, 'classes');
  }, []);

  // Handle Teacher-Class Assignment
  const handleAssignTeacherToClass = async () => {
    // Check against empty string, as state is initialized to empty string
    if (!selectedTeacher || !selectedClassForTeacher) {
      toast({ variant: "destructive", title: "Error", description: "Please select both a teacher and a class." });
      return;
    }
    setIsSubmittingTeacher(true);
    try {
      const classRef = doc(db, "classes", selectedClassForTeacher);
      // Simple assignment: Set the teacherId field on the class document.
      // Assumes one teacher per class. If multiple, use arrayUnion.
      await updateDoc(classRef, { teacherId: selectedTeacher });

      // Optional: Update teacher's assignedClassIds array
      const teacherRef = doc(db, "users", selectedTeacher);
      await updateDoc(teacherRef, { assignedClassIds: arrayUnion(selectedClassForTeacher) });

      toast({ title: "Success", description: "Teacher assigned to class successfully." });
       // Reset selections after successful assignment? Maybe not, allow multiple assignments.
      // setSelectedTeacher('');
      // setSelectedClassForTeacher('');
    } catch (err) {
      console.error("Error assigning teacher:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to assign teacher to class." });
    } finally {
      setIsSubmittingTeacher(false);
    }
  };

   // Handle Parent-Student Linking
  const handleLinkParentToStudent = async () => {
    // Check against empty string
    if (!selectedParent || !selectedStudentForParent) {
      toast({ variant: "destructive", title: "Error", description: "Please select both a parent and a student." });
      return;
    }
    setIsSubmittingParent(true);
    try {
       // Update Parent's childIds array
      const parentRef = doc(db, "users", selectedParent);
      await updateDoc(parentRef, { childIds: arrayUnion(selectedStudentForParent) });

       // Update Student's parentIds array
      const studentRef = doc(db, "users", selectedStudentForParent);
      await updateDoc(studentRef, { parentIds: arrayUnion(selectedParent) });

      toast({ title: "Success", description: "Parent linked to student successfully." });
        // Reset selections?
      // setSelectedParent('');
      // setSelectedStudentForParent('');
    } catch (err) {
      console.error("Error linking parent:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to link parent to student." });
    } finally {
      setIsSubmittingParent(false);
    }
  };

  // TODO: Implement Unlink/Unassign functions similar to above, using arrayRemove

  const isLoading = loading.teachers || loading.parents || loading.students || loading.classes;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Teacher to Class Assignment Card */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Teacher to Class</CardTitle>
          <CardDescription>Select a teacher and the class they will manage.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-select">Teacher</Label>
              {/* Pass value={selectedTeacher || ''} to handle initial undefined/null state if needed, but '' is fine */}
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher} disabled={loading.teachers}>
                <SelectTrigger id="teacher-select">
                  {/* Placeholder updated */}
                  <SelectValue placeholder={loading.teachers ? "Loading..." : "Select Teacher"} />
                </SelectTrigger>
                <SelectContent>
                   {/* Optional: Add a disabled placeholder item if needed */}
                   {/* <SelectItem value="none" disabled>Select Teacher</SelectItem> */}
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
                  {/* <SelectItem value="none" disabled>Select Class</SelectItem> */}
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
            {/* TODO: Add Unassign Button */}
            {/* <Button variant="outline" disabled={isSubmittingTeacher}>Unassign</Button> */}
          <Button onClick={handleAssignTeacherToClass} disabled={isSubmittingTeacher || isLoading}>
            {isSubmittingTeacher && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <UserCheck className="mr-2 h-4 w-4" /> Assign Teacher
          </Button>
        </CardFooter>
      </Card>

      {/* Parent to Student Linking Card */}
      <Card>
        <CardHeader>
          <CardTitle>Link Parent to Student</CardTitle>
          <CardDescription>Connect a parent account to their child's student record.</CardDescription>
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
                  {/* <SelectItem value="none" disabled>Select Parent</SelectItem> */}
                  {parents.map(parent => (
                    <SelectItem key={parent.id} value={parent.id}>{parent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="student-select-parent">Student</Label>
              <Select value={selectedStudentForParent} onValueChange={setSelectedStudentForParent} disabled={loading.students}>
                <SelectTrigger id="student-select-parent">
                  <SelectValue placeholder={loading.students ? "Loading..." : "Select Student"} />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="none" disabled>Select Student</SelectItem> */}
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
            {/* TODO: Add Unlink Button */}
            {/* <Button variant="outline" disabled={isSubmittingParent}><Unlink className="mr-2 h-4 w-4"/> Unlink</Button> */}
          <Button onClick={handleLinkParentToStudent} disabled={isSubmittingParent || isLoading}>
            {isSubmittingParent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             <LinkIcon className="mr-2 h-4 w-4" /> Link Parent
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Card className="lg:col-span-2 border-destructive bg-destructive/10">
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
