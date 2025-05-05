// src/app/admin/parents/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, Timestamp, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"; // Removed unused getDoc
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link as LinkIcon, UserX } from "lucide-react"; // Renamed Link to LinkIcon, added UserX
import type { Parent, UserProfile, Student } from "@/lib/types"; // Import types

// Display type combining UserProfile and Parent specifics
interface ParentDisplay extends Omit<UserProfile, 'role' | 'uid' | 'createdAt'>, Omit<Parent, 'id' | 'email' | 'name'>{
    id: string;
    role: 'Parent';
    email: string; // Ensure email is here
    name: string; // Ensure name is here
    // Inherits childIds? from Parent
}

interface StudentSelectItem extends Pick<Student, 'id' | 'name' | 'studentInfo'> {
    // Add other relevant fields if needed
}


export default function ManageParentsPage() {
  const [parents, setParents] = useState<ParentDisplay[]>([]);
  const [allStudents, setAllStudents] = useState<StudentSelectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // State for the link student dialog
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedParentForLinking, setSelectedParentForLinking] = useState<ParentDisplay | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [loadingStudentsForDialog, setLoadingStudentsForDialog] = useState(false);
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);


  // Fetch parents from Firestore (users with role 'Parent')
  const fetchParents = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "users"), where("role", "==", "Parent"));
      const querySnapshot = await getDocs(q);
      const parentList = querySnapshot.docs.map(doc => {
         const data = doc.data();
         return {
             id: doc.id,
             name: data.name || 'Unnamed Parent',
             email: data.email,
             role: 'Parent',
             childIds: data.childIds || [],
             // createdAt: data.createdAt as Timestamp, // Cast Firestore Timestamp - not needed for display
         } as ParentDisplay; // Use explicit cast
      });
      setParents(parentList);
    } catch (err: any) {
      console.error("Error fetching parents:", err);
      setError("Failed to load parents. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Failed to load parents." });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all students once for the dialog
  const fetchAllStudents = async () => {
    setLoadingStudentsForDialog(true);
    try {
      const q = query(collection(db, "users"), where("role", "==", "Student"));
      const querySnapshot = await getDocs(q);
      const studentList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              name: data.name || 'Unnamed Student',
              studentInfo: data.studentInfo || 'N/A',
          } as StudentSelectItem;
      });
      setAllStudents(studentList);
    } catch (err: any) {
        console.error("Error fetching students:", err);
        // Don't block the main page load, error handled in dialog
        toast({ variant: "destructive", title: "Error", description: "Failed to load student list for linking." });
    } finally {
        setLoadingStudentsForDialog(false);
    }
  };


  useEffect(() => {
    fetchParents();
    fetchAllStudents(); // Fetch students when the page loads
  }, [toast]); // Added toast to dependency array


  // Open the link student dialog
  const handleOpenLinkDialog = (parent: ParentDisplay) => {
    setSelectedParentForLinking(parent);
    // Filter students: show only those NOT already linked to *this* parent
    const currentlyLinkedIds = new Set(parent.childIds || []);
    const available = allStudents.filter(student => !currentlyLinkedIds.has(student.id));
     // Initialize selection based on already linked, maybe? For now, start fresh.
     // Or, show ALL students and check those already linked? -> Let's stick to showing only unlinked ones for linking
    setSelectedStudentIds(new Set()); // Start with empty selection for adding new links
    setIsLinkDialogOpen(true);
  };

  // Handle checkbox change in the dialog
   const handleStudentSelectionChange = (studentId: string, checked: boolean | 'indeterminate') => {
     setSelectedStudentIds(prev => {
       const newSet = new Set(prev);
       if (checked === true) { // Use === true because it can be 'indeterminate'
         newSet.add(studentId);
       } else {
         newSet.delete(studentId);
       }
       return newSet;
     });
   };


   // Handle saving the parent-student links (Add)
   const handleSaveLinks = async () => {
     if (!selectedParentForLinking) return;
     if (selectedStudentIds.size === 0) {
         toast({ variant: "warning", title: "No Selection", description: "Please select at least one student to link." });
         return;
     }

     setIsSubmittingLink(true);
     try {
       const parentRef = doc(db, "users", selectedParentForLinking.id);
       const studentIdsToLink = Array.from(selectedStudentIds);

       // Update parent's childIds
       await updateDoc(parentRef, {
         childIds: arrayUnion(...studentIdsToLink) // Use arrayUnion to add without duplicates
       });

       // Update each selected student's parentIds
       const studentUpdatePromises = studentIdsToLink.map(studentId => {
         const studentRef = doc(db, "users", studentId);
         return updateDoc(studentRef, {
           parentIds: arrayUnion(selectedParentForLinking.id) // Use arrayUnion
         });
       });

       await Promise.all(studentUpdatePromises);

       toast({ title: "Success", description: "Selected students linked to parent successfully." });
       setIsLinkDialogOpen(false); // Close dialog
       fetchParents(); // Refresh the parent list to show updated counts

     } catch (err: any) {
       console.error("Error linking students:", err);
       toast({ variant: "destructive", title: "Linking Failed", description: "Could not save the links. Please try again." });
     } finally {
       setIsSubmittingLink(false);
     }
   };

    // Handle unlinking a student from a parent
    // This might need a different UI, e.g., a button next to each linked child in a details view,
    // or a multi-select in the dialog to choose which *existing* links to remove.
    // For simplicity, let's assume we add an "Unlink" button in the dialog for selected students.
    // This function would be called by a separate "Unlink Selected" button.
    const handleUnlinkStudents = async () => {
      if (!selectedParentForLinking) return;
      if (selectedStudentIds.size === 0) {
          toast({ variant: "warning", title: "No Selection", description: "Please select at least one student to unlink." });
          return;
      }

      // Filter selectedStudentIds to only include those *actually* linked to the parent
      const currentlyLinkedIds = new Set(selectedParentForLinking.childIds || []);
      const studentIdsToUnlink = Array.from(selectedStudentIds).filter(id => currentlyLinkedIds.has(id));

       if (studentIdsToUnlink.length === 0) {
            toast({ variant: "info", title: "Info", description: "None of the selected students are currently linked to this parent." });
            return;
       }


      setIsSubmittingLink(true); // Reuse submitting state? Or create a new one? Reusing for now.
      try {
        const parentRef = doc(db, "users", selectedParentForLinking.id);

        // Remove students from parent's childIds
        await updateDoc(parentRef, {
          childIds: arrayRemove(...studentIdsToUnlink)
        });

        // Remove parent from each unlinked student's parentIds
        const studentUpdatePromises = studentIdsToUnlink.map(studentId => {
          const studentRef = doc(db, "users", studentId);
          return updateDoc(studentRef, {
            parentIds: arrayRemove(selectedParentForLinking.id)
          });
        });

        await Promise.all(studentUpdatePromises);

        toast({ title: "Success", description: "Selected students unlinked from parent successfully." });
        setIsLinkDialogOpen(false); // Close dialog
        fetchParents(); // Refresh the parent list

      } catch (err: any) {
        console.error("Error unlinking students:", err);
        toast({ variant: "destructive", title: "Unlinking Failed", description: "Could not remove the links. Please try again." });
      } finally {
        setIsSubmittingLink(false);
      }
    };


   // Determine students available to link (not currently linked)
   const availableStudentsForLinking = selectedParentForLinking
     ? allStudents.filter(student => !selectedParentForLinking.childIds?.includes(student.id))
     : [];

   // Determine students already linked (for potential unlinking UI in dialog)
    const linkedStudents = selectedParentForLinking
     ? allStudents.filter(student => selectedParentForLinking.childIds?.includes(student.id))
     : [];


  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
           <div>
              <CardTitle>Manage Parents</CardTitle>
              <CardDescription>View parent accounts and link/unlink them to students.</CardDescription>
          </div>
          {/* Button to add parents removed as they sign up themselves */}
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
                    <TableHead>Linked Children</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parents.length > 0 ? (
                    parents.map((parent) => (
                      <TableRow key={parent.id}>
                        <TableCell className="font-medium">{parent.name}</TableCell>
                        <TableCell>{parent.email}</TableCell>
                        <TableCell>{parent.childIds?.length || 0}</TableCell>
                        <TableCell className="text-right">
                          {/* Open Dialog to manage links (both link and unlink) */}
                          <Button variant="outline" size="sm" onClick={() => handleOpenLinkDialog(parent)} className="gap-1">
                            <LinkIcon className="h-4 w-4" />
                            Manage Links
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No parents found. Parents sign up themselves via the login page.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
             </div>
          )}
        </CardContent>
      </Card>

      {/* Link/Unlink Student Dialog */}
       <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
         <DialogContent className="sm:max-w-[600px]"> {/* Increased width */}
           <DialogHeader>
             <DialogTitle>Manage Student Links for {selectedParentForLinking?.name || 'Parent'}</DialogTitle>
             <DialogDescription>Select students to link or unlink from this parent.</DialogDescription>
           </DialogHeader>
           <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Split into two columns */}
                {/* Column 1: Already Linked Students (for Unlinking) */}
                 <div className="space-y-3">
                    <h4 className="font-medium text-sm border-b pb-1">Currently Linked Students</h4>
                     {loadingStudentsForDialog ? (
                       <div className="flex justify-center items-center h-40">
                         <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                       </div>
                     ) : linkedStudents.length > 0 ? (
                         <ScrollArea className="h-72 w-full rounded-md border p-4">
                            <div className="space-y-2">
                                {linkedStudents.map((student) => (
                                    <div key={student.id} className="flex items-center space-x-3">
                                        <Checkbox
                                            id={`linked-student-${student.id}`}
                                            checked={selectedStudentIds.has(student.id)}
                                            onCheckedChange={(checked) => handleStudentSelectionChange(student.id, checked)}
                                            aria-label={`Select ${student.name} to potentially unlink`}
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
                           No students currently linked.
                       </p>
                     )}
                     <Button
                       type="button"
                       variant="outline"
                       size="sm"
                       className="w-full gap-1 mt-2"
                       onClick={handleUnlinkStudents}
                       disabled={isSubmittingLink || loadingStudentsForDialog || selectedStudentIds.size === 0 || linkedStudents.length === 0 || !Array.from(selectedStudentIds).some(id => linkedStudents.find(s => s.id === id))} // Disable if no linked selected
                      >
                       <UserX className="h-4 w-4" /> Unlink Selected
                     </Button>
                 </div>

                 {/* Column 2: Available Students (for Linking) */}
                 <div className="space-y-3">
                     <h4 className="font-medium text-sm border-b pb-1">Available Students to Link</h4>
                     {loadingStudentsForDialog ? (
                         <div className="flex justify-center items-center h-40">
                           <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                         </div>
                     ) : availableStudentsForLinking.length > 0 ? (
                         <ScrollArea className="h-72 w-full rounded-md border p-4">
                             <div className="space-y-2">
                                 {availableStudentsForLinking.map((student) => (
                                     <div key={student.id} className="flex items-center space-x-3">
                                         <Checkbox
                                             id={`available-student-${student.id}`}
                                             checked={selectedStudentIds.has(student.id)}
                                             onCheckedChange={(checked) => handleStudentSelectionChange(student.id, checked)}
                                             aria-label={`Select ${student.name} to link`}
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
                             No other students available to link.
                         </p>
                     )}
                      <Button
                        type="button"
                        size="sm"
                        className="w-full gap-1 mt-2"
                        onClick={handleSaveLinks}
                        disabled={isSubmittingLink || loadingStudentsForDialog || selectedStudentIds.size === 0 || availableStudentsForLinking.length === 0 || !Array.from(selectedStudentIds).some(id => availableStudentsForLinking.find(s => s.id === id))} // Disable if no available selected
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
             {/* Moved action buttons inside the columns */}
           </DialogFooter>
         </DialogContent>
       </Dialog>
    </>
  );
}
