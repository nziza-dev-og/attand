// src/app/admin/parents/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link as LinkIcon, UserX } from "lucide-react";
import type { Parent, UserProfile, Student } from "@/lib/types";

interface ParentDisplay extends Omit<UserProfile, 'role' | 'uid' | 'createdAt'>, Omit<Parent, 'id' | 'email' | 'name'>{
    id: string;
    role: 'Parent';
    email: string;
    name: string;
    enteredSchoolCode?: string;
}

interface StudentSelectItem extends Pick<Student, 'id' | 'name' | 'studentInfo' | 'schoolId'> {}

export default function ManageParentsPage() {
  const { schoolId: adminSchoolId, user: adminUser, loading: authLoading } = useAuth();
  const [adminSchoolIdentifierCode, setAdminSchoolIdentifierCode] = useState<string | null>(null);
  const [parents, setParents] = useState<ParentDisplay[]>([]);
  const [studentsInSchool, setStudentsInSchool] = useState<StudentSelectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedParentForLinking, setSelectedParentForLinking] = useState<ParentDisplay | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);

  useEffect(() => {
    const fetchAdminSchoolCode = async () => {
      if (adminUser) {
        const adminDocRef = doc(db, "users", adminUser.uid);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          setAdminSchoolIdentifierCode(adminDocSnap.data().schoolIdentifierCode || null);
        }
      }
    };
    if (!authLoading) {
      fetchAdminSchoolCode();
    }
  }, [adminUser, authLoading]);

  useEffect(() => {
    const fetchParentsAndStudents = async () => {
      if (!adminSchoolId || authLoading || adminSchoolIdentifierCode === undefined) {
        if (!authLoading && (!adminSchoolId || adminSchoolIdentifierCode === undefined) ) {
            setError("Admin context or school code is missing.");
            setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch parents who entered this admin's school code OR are already linked to a student in this school
        const parentsByCodeQuery = adminSchoolIdentifierCode 
          ? query(collection(db, "users"), where("role", "==", "Parent"), where("enteredSchoolCode", "==", adminSchoolIdentifierCode))
          : null;

        // Fetch students in the admin's school
        const studentsInSchoolQuery = query(collection(db, "users"), where("role", "==", "Student"), where("schoolId", "==", adminSchoolId));
        const studentsSnapshot = await getDocs(studentsInSchoolQuery);
        const schoolStudentList = studentsSnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            name: docSnap.data().name || 'Unnamed Student',
            studentInfo: docSnap.data().studentInfo || 'N/A',
            schoolId: docSnap.data().schoolId,
        } as StudentSelectItem));
        setStudentsInSchool(schoolStudentList);

        const parentIdsFromStudents = new Set<string>();
        studentsSnapshot.docs.forEach(studentDoc => {
            const studentData = studentDoc.data() as Student;
            if(studentData.parentIds) {
                studentData.parentIds.forEach(pid => parentIdsFromStudents.add(pid));
            }
        });
        
        const allRelevantParentIds = new Set<string>(parentIdsFromStudents);
        let parentsByCodeList: ParentDisplay[] = [];

        if (parentsByCodeQuery) {
            const parentsByCodeSnapshot = await getDocs(parentsByCodeQuery);
            parentsByCodeList = parentsByCodeSnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                allRelevantParentIds.add(docSnap.id);
                return {
                    id: docSnap.id,
                    name: data.name || 'Unnamed Parent',
                    email: data.email,
                    role: 'Parent',
                    childIds: data.childIds || [],
                    enteredSchoolCode: data.enteredSchoolCode,
                } as ParentDisplay;
            });
        }
        
        let finalParentList: ParentDisplay[] = [];
        if (allRelevantParentIds.size > 0) {
            // Firestore 'in' query limit is 30. Batch if necessary.
            const idsArray = Array.from(allRelevantParentIds);
            const parentPromises = [];
            for (let i = 0; i < idsArray.length; i += 30) {
                const batchIds = idsArray.slice(i, i + 30);
                parentPromises.push(getDocs(query(collection(db, "users"), where("__name__", "in", batchIds), where("role", "==", "Parent"))));
            }
            const parentSnapshots = await Promise.all(parentPromises);
            parentSnapshots.forEach(snapshot => {
                snapshot.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    finalParentList.push({
                        id: docSnap.id,
                        name: data.name || 'Unnamed Parent',
                        email: data.email,
                        role: 'Parent',
                        childIds: data.childIds || [],
                        enteredSchoolCode: data.enteredSchoolCode,
                    } as ParentDisplay);
                });
            });
        }
         // Deduplicate (in case a parent entered code AND is linked)
        const uniqueParentMap = new Map<string, ParentDisplay>();
        finalParentList.forEach(p => uniqueParentMap.set(p.id, p));
        setParents(Array.from(uniqueParentMap.values()));

      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("Failed to load parents or students. Please try again.");
        toast({ variant: "destructive", title: "Error", description: "Failed to load data." });
      } finally {
        setLoading(false);
      }
    };

    fetchParentsAndStudents();
  }, [adminSchoolId, adminSchoolIdentifierCode, authLoading, toast]);


  const handleOpenLinkDialog = (parent: ParentDisplay) => {
    setSelectedParentForLinking(parent);
    setSelectedStudentIds(new Set()); 
    setIsLinkDialogOpen(true);
  };

  const handleStudentSelectionChange = (studentId: string, checked: boolean | 'indeterminate') => {
     setSelectedStudentIds(prev => {
       const newSet = new Set(prev);
       if (checked === true) {
         newSet.add(studentId);
       } else {
         newSet.delete(studentId);
       }
       return newSet;
     });
   };

   const handleSaveLinks = async () => {
     if (!selectedParentForLinking || !adminSchoolId) return;
     if (selectedStudentIds.size === 0) {
         toast({ variant: "warning", title: "No Selection", description: "Please select at least one student to link." });
         return;
     }

     setIsSubmittingLink(true);
     try {
       const parentRef = doc(db, "users", selectedParentForLinking.id);
       const studentIdsToLink = Array.from(selectedStudentIds);

       // Verify selected students belong to the admin's school
       for (const studentId of studentIdsToLink) {
         const studentDoc = await getDoc(doc(db, "users", studentId));
         if (!studentDoc.exists() || studentDoc.data()?.schoolId !== adminSchoolId) {
           toast({ variant: "destructive", title: "Error", description: `Student ${studentId} does not belong to your school.` });
           setIsSubmittingLink(false);
           return;
         }
       }

       await updateDoc(parentRef, { childIds: arrayUnion(...studentIdsToLink) });

       const studentUpdatePromises = studentIdsToLink.map(studentId => {
         const studentRef = doc(db, "users", studentId);
         return updateDoc(studentRef, { parentIds: arrayUnion(selectedParentForLinking.id) });
       });
       await Promise.all(studentUpdatePromises);

       toast({ title: "Success", description: "Selected students linked to parent successfully." });
       setIsLinkDialogOpen(false);
       // Refresh parent list locally or re-fetch
        setParents(prevParents => prevParents.map(p => 
            p.id === selectedParentForLinking.id 
            ? { ...p, childIds: Array.from(new Set([...(p.childIds || []), ...studentIdsToLink])) } 
            : p
        ));
       setSelectedStudentIds(new Set());

     } catch (err: any) {
       console.error("Error linking students:", err);
       toast({ variant: "destructive", title: "Linking Failed", description: "Could not save the links." });
     } finally {
       setIsSubmittingLink(false);
     }
   };

    const handleUnlinkStudents = async () => {
      if (!selectedParentForLinking || !adminSchoolId) return;
      if (selectedStudentIds.size === 0) {
          toast({ variant: "warning", title: "No Selection", description: "Please select at least one student to unlink." });
          return;
      }

      const studentIdsToUnlink = Array.from(selectedStudentIds).filter(id => 
        (selectedParentForLinking.childIds || []).includes(id) &&
        studentsInSchool.find(s => s.id === id)?.schoolId === adminSchoolId
      );

       if (studentIdsToUnlink.length === 0) {
            toast({ variant: "info", title: "Info", description: "None of the selected students are currently linked to this parent within your school." });
            return;
       }

      setIsSubmittingLink(true); 
      try {
        const parentRef = doc(db, "users", selectedParentForLinking.id);
        await updateDoc(parentRef, { childIds: arrayRemove(...studentIdsToUnlink) });

        const studentUpdatePromises = studentIdsToUnlink.map(studentId => {
          const studentRef = doc(db, "users", studentId);
          return updateDoc(studentRef, { parentIds: arrayRemove(selectedParentForLinking.id) });
        });
        await Promise.all(studentUpdatePromises);

        toast({ title: "Success", description: "Selected students unlinked from parent successfully." });
        setIsLinkDialogOpen(false);
        setParents(prevParents => prevParents.map(p => 
            p.id === selectedParentForLinking.id 
            ? { ...p, childIds: (p.childIds || []).filter(id => !studentIdsToUnlink.includes(id)) }
            : p
        ));
        setSelectedStudentIds(new Set());

      } catch (err: any) {
        console.error("Error unlinking students:", err);
        toast({ variant: "destructive", title: "Unlinking Failed", description: "Could not remove the links." });
      } finally {
        setIsSubmittingLink(false);
      }
    };

   const availableStudentsForLinking = selectedParentForLinking
     ? studentsInSchool.filter(student => !selectedParentForLinking.childIds?.includes(student.id))
     : [];

    const linkedStudentsInSchool = selectedParentForLinking
     ? studentsInSchool.filter(student => selectedParentForLinking.childIds?.includes(student.id))
     : [];

  if (authLoading && loading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!adminSchoolId && !authLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Manage Parents Unavailable</CardTitle></CardHeader>
        <CardContent><p>Admin school context is missing. Cannot manage parents.</p></CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
           <div>
              <CardTitle>Manage Parents</CardTitle>
              <CardDescription>View parents associated with your school (via entered school code or linked children) and manage student links.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center items-center py-10">
               <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
               <span className="ml-2">Loading parents...</span>
             </div>
           ) : error ? (
              <p className="text-center text-destructive">{error}</p>
           ) : (
             <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Entered School Code</TableHead>
                    <TableHead>Linked Children (Your School)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parents.length > 0 ? (
                    parents.map((parent) => {
                      const linkedChildrenCountInSchool = parent.childIds?.filter(childId => studentsInSchool.some(s => s.id === childId)).length || 0;
                      return (
                        <TableRow key={parent.id}>
                          <TableCell className="font-medium">{parent.name}</TableCell>
                          <TableCell>{parent.email}</TableCell>
                          <TableCell>{parent.enteredSchoolCode || 'N/A'}</TableCell>
                          <TableCell>{linkedChildrenCountInSchool}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleOpenLinkDialog(parent)} className="gap-1">
                              <LinkIcon className="h-4 w-4" />
                              Manage Links
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No parents found associated with your school's code or linked to students in your school.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
             </div>
          )}
        </CardContent>
      </Card>

       <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
         <DialogContent className="sm:max-w-[600px]">
           <DialogHeader>
             <DialogTitle>Manage Student Links for {selectedParentForLinking?.name || 'Parent'}</DialogTitle>
             <DialogDescription>Select students from your school to link or unlink from this parent.</DialogDescription>
           </DialogHeader>
           <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <h4 className="font-medium text-sm border-b pb-1">Currently Linked (Your School)</h4>
                     {studentsInSchool.length === 0 && !loading ? (
                        <p className="text-center text-muted-foreground h-40 flex items-center justify-center">No students in your school to link.</p>
                     ): linkedStudentsInSchool.length > 0 ? (
                         <ScrollArea className="h-72 w-full rounded-md border p-4">
                            <div className="space-y-2">
                                {linkedStudentsInSchool.map((student) => (
                                    <div key={student.id} className="flex items-center space-x-3">
                                        <Checkbox
                                            id={`linked-student-${student.id}`}
                                            checked={selectedStudentIds.has(student.id)}
                                            onCheckedChange={(checked) => handleStudentSelectionChange(student.id, checked)}
                                        />
                                        <Label htmlFor={`linked-student-${student.id}`} className="flex-1 cursor-pointer">
                                            {student.name} <span className="text-xs text-muted-foreground">({student.studentInfo || 'No Info'})</span>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                         </ScrollArea>
                     ) : (
                       <p className="text-center text-muted-foreground h-40 flex items-center justify-center">
                           No students from your school currently linked.
                       </p>
                     )}
                     <Button
                       type="button"
                       variant="outline"
                       size="sm"
                       className="w-full gap-1 mt-2"
                       onClick={handleUnlinkStudents}
                       disabled={isSubmittingLink || loading || selectedStudentIds.size === 0 || linkedStudentsInSchool.length === 0 || !Array.from(selectedStudentIds).some(id => linkedStudentsInSchool.find(s => s.id === id))}
                      >
                       {isSubmittingLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                       <UserX className="h-4 w-4" /> Unlink Selected
                     </Button>
                 </div>

                 <div className="space-y-3">
                     <h4 className="font-medium text-sm border-b pb-1">Available to Link (Your School)</h4>
                     {studentsInSchool.length === 0 && !loading ? (
                        <p className="text-center text-muted-foreground h-40 flex items-center justify-center">No students in your school to link.</p>
                     ) : availableStudentsForLinking.length > 0 ? (
                         <ScrollArea className="h-72 w-full rounded-md border p-4">
                             <div className="space-y-2">
                                 {availableStudentsForLinking.map((student) => (
                                     <div key={student.id} className="flex items-center space-x-3">
                                         <Checkbox
                                             id={`available-student-${student.id}`}
                                             checked={selectedStudentIds.has(student.id)}
                                             onCheckedChange={(checked) => handleStudentSelectionChange(student.id, checked)}
                                         />
                                         <Label htmlFor={`available-student-${student.id}`} className="flex-1 cursor-pointer">
                                             {student.name} <span className="text-xs text-muted-foreground">({student.studentInfo || 'No Info'})</span>
                                         </Label>
                                     </div>
                                 ))}
                             </div>
                         </ScrollArea>
                     ) : (
                         <p className="text-center text-muted-foreground h-40 flex items-center justify-center">
                             All students in your school are already linked or no students available.
                         </p>
                     )}
                      <Button
                        type="button"
                        size="sm"
                        className="w-full gap-1 mt-2"
                        onClick={handleSaveLinks}
                        disabled={isSubmittingLink || loading || selectedStudentIds.size === 0 || availableStudentsForLinking.length === 0 || !Array.from(selectedStudentIds).some(id => availableStudentsForLinking.find(s => s.id === id))}
                       >
                        {isSubmittingLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <LinkIcon className="h-4 w-4" /> Link Selected
                      </Button>
                 </div>
           </div>
           <DialogFooter>
             <DialogClose asChild>
               <Button type="button" variant="outline">Close</Button>
             </DialogClose>
           </DialogFooter>
         </DialogContent>
       </Dialog>
    </>
  );
}

    