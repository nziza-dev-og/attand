// src/app/admin/parents/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link as LinkIcon } from "lucide-react"; // Renamed Link to LinkIcon
import type { Parent, UserProfile } from "@/lib/types"; // Import Parent type

// Display type combining UserProfile and Parent specifics
interface ParentDisplay extends Omit<UserProfile, 'role'>, Omit<Parent, 'id' | 'email' | 'name'>{
    id: string;
    role: 'Parent';
    // Inherits childIds? from Parent
}


export default function ManageParentsPage() {
  const [parents, setParents] = useState<ParentDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
             uid: doc.id, // Assuming uid is the doc id
             name: data.name || 'Unnamed Parent',
             email: data.email,
             role: 'Parent',
             childIds: data.childIds || [],
             createdAt: data.createdAt as Timestamp, // Cast Firestore Timestamp
         } as ParentDisplay;
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

  useEffect(() => {
    fetchParents();
  }, []); // Fetch on component mount

  // Placeholder function for handling parent-student linking
  const handleLinkStudent = (parentId: string) => {
    console.log("Initiate linking for parent:", parentId);
    // TODO: Implement linking logic (e.g., open a dialog to select student(s))
    toast({ title: "Info", description: "Parent-student linking functionality not yet implemented." });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
         <div>
            <CardTitle>Manage Parents</CardTitle>
            <CardDescription>View parent accounts and link them to students.</CardDescription>
        </div>
        {/* Add button or mechanism for linking might go here or within the table rows */}
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
                        <Button variant="outline" size="sm" onClick={() => handleLinkStudent(parent.id)} className="gap-1">
                          <LinkIcon className="h-4 w-4" />
                          Link Student
                        </Button>
                         {/* Add other actions like Edit/View Details if needed */}
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
  );
}