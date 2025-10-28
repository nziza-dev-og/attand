// src/app/admin/settings/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc, writeBatch, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, CalendarIcon, Settings, CheckCircle, Circle } from "lucide-react";
import { format, isBefore } from "date-fns";
import type { AcademicYear, Term } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const { schoolId, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddYearOpen, setIsAddYearOpen] = useState(false);
  const [newYearName, setNewYearName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAcademicYears = React.useCallback(async () => {
      if (!schoolId || authLoading) {
        if (!authLoading) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const q = query(collection(db, "academicYears"), where("schoolId", "==", schoolId), orderBy("startDate", "desc"));
        const querySnapshot = await getDocs(q);
        const years = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicYear));
        setAcademicYears(years);
      } catch (error) {
        console.error("Error fetching academic years:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load academic years." });
      } finally {
        setLoading(false);
      }
    }, [schoolId, authLoading, toast]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  const handleAddAcademicYear = async () => {
    if (!schoolId || !newYearName.trim()) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please provide a name for the academic year." });
      return;
    }
    
    // Logic to infer dates from name like "2024-2025"
    const yearParts = newYearName.match(/(\d{4})-(\d{4})/);
    let startDate: Date, endDate: Date;
    if (yearParts) {
        startDate = new Date(parseInt(yearParts[1]), 7, 1); // August 1st of start year
        endDate = new Date(parseInt(yearParts[2]), 5, 30); // June 30th of end year
    } else {
        const currentYear = new Date().getFullYear();
        startDate = new Date(currentYear, 7, 1); // Default to current year August 1st
        endDate = new Date(currentYear + 1, 5, 30); // Default to next year June 30th
        toast({variant: "info", title: "Default Dates Used", description: "Could not infer year from name, using default dates (Aug 1 - Jun 30)."});
    }

    setIsSubmitting(true);
    try {
      const newYearData: Omit<AcademicYear, 'id'> = {
        name: newYearName.trim(),
        schoolId: schoolId,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        isActive: false, // Initially not active
        activeTermId: 'term1', // Default to term1 being active
        terms: [
            { id: 'term1', name: 'Term 1', startDate: Timestamp.fromDate(startDate), endDate: Timestamp.fromDate(new Date(startDate.getFullYear(), 11, 20)), studentEnrollments: {} },
            { id: 'term2', name: 'Term 2', startDate: Timestamp.fromDate(new Date(startDate.getFullYear() + 1, 0, 10)), endDate: Timestamp.fromDate(new Date(startDate.getFullYear() + 1, 2, 30)), studentEnrollments: {} },
            { id: 'term3', name: 'Term 3', startDate: Timestamp.fromDate(new Date(startDate.getFullYear() + 1, 3, 10)), endDate: Timestamp.fromDate(endDate), studentEnrollments: {} },
        ]
      };

      const yearDocRef = await addDoc(collection(db, "academicYears"), newYearData);
      
      toast({ title: "Success", description: "Academic year created. Activate it to make it the current year for your school." });
      setIsAddYearOpen(false);
      setNewYearName("");
      fetchAcademicYears(); // Refresh list

    } catch (error) {
      console.error("Error adding academic year:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create academic year." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTermDateChange = async (yearId: string, termId: string, newDate: Date | undefined, dateType: 'startDate' | 'endDate') => {
    if (!newDate) return;

    const yearIndex = academicYears.findIndex(y => y.id === yearId);
    if (yearIndex === -1) return;

    const year = { ...academicYears[yearIndex] };
    const termIndex = year.terms.findIndex(t => t.id === termId);
    if (termIndex === -1) return;

    // Create a deep copy to avoid direct state mutation before API call
    const updatedTerms = JSON.parse(JSON.stringify(year.terms));
    updatedTerms[termIndex][dateType] = Timestamp.fromDate(newDate);
    
    try {
        const yearDocRef = doc(db, "academicYears", yearId);
        await updateDoc(yearDocRef, { terms: updatedTerms });
        toast({ title: "Term Updated", description: "Term date has been saved." });
        fetchAcademicYears(); // Re-fetch to get the latest state
    } catch (error) {
        console.error("Error updating term date:", error);
        toast({ variant: "destructive", title: "Update Failed", description: "Could not save the term date." });
    }
  };

  const setActiveAcademicYear = async (yearToActivate: AcademicYear) => {
    if (!schoolId) return;
    const batch = writeBatch(db);
    
    academicYears.forEach(year => {
        const yearRef = doc(db, "academicYears", year.id);
        if (year.id === yearToActivate.id) {
            batch.update(yearRef, { isActive: true });
        } else if (year.isActive) {
            batch.update(yearRef, { isActive: false });
        }
    });

    try {
        await batch.commit();
        toast({ title: "Success", description: `${yearToActivate.name} is now the active academic year.` });
        fetchAcademicYears();
    } catch (error) {
        console.error("Error setting active year:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not set the active academic year." });
    }
  };

  const endActiveTerm = async (year: AcademicYear) => {
      const currentTermIndex = year.terms.findIndex(t => t.id === year.activeTermId);
      if (currentTermIndex === -1 || currentTermIndex === year.terms.length - 1) {
        toast({ variant: "destructive", title: "Action Not Allowed", description: "This is the last term. End the academic year instead." });
        return;
      }
      const nextTerm = year.terms[currentTermIndex + 1];
      try {
        const yearRef = doc(db, "academicYears", year.id);
        await updateDoc(yearRef, { activeTermId: nextTerm.id });
        toast({ title: "Term Ended", description: `${year.terms[currentTermIndex].name} has ended. ${nextTerm.name} is now active.` });
        fetchAcademicYears();
      } catch (error) {
          toast({ variant: "destructive", title: "Error", description: "Could not end the current term."});
      }
  };

  const endAcademicYear = async (year: AcademicYear) => {
      if (year.activeTermId !== year.terms[year.terms.length - 1].id) {
          toast({ variant: "warning", title: "Not Last Term", description: "You can only end the academic year when the final term is active." });
          return;
      }
      try {
          const yearRef = doc(db, "academicYears", year.id);
          await updateDoc(yearRef, { isActive: false });
          toast({ title: "Academic Year Ended", description: `${year.name} has been marked as inactive.`});
          fetchAcademicYears();
      } catch (error) {
          toast({ variant: "destructive", title: "Error", description: "Could not end the academic year."});
      }
  };


  if (loading || authLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!schoolId && !authLoading) {
      return <Card><CardContent className="p-6">Admin school context is missing. Cannot manage settings.</CardContent></Card>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Settings className="h-6 w-6"/>School Settings</CardTitle>
          <CardDescription>Manage academic years and terms for your school.</CardDescription>
        </div>
        <Dialog open={isAddYearOpen} onOpenChange={setIsAddYearOpen}>
          <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                  <PlusCircle className="h-4 w-4"/> Create Academic Year
              </Button>
          </DialogTrigger>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Create New Academic Year</DialogTitle>
                   <DialogDescription>Enter a name for the new academic year (e.g., "2024-2025"). Dates will be inferred automatically.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div>
                      <Label htmlFor="year-name">Academic Year Name</Label>
                      <Input id="year-name" value={newYearName} onChange={(e) => setNewYearName(e.target.value)} placeholder="e.g., 2024-2025"/>
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={handleAddAcademicYear} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                      Create Year
                  </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {academicYears.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No academic years created yet.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {academicYears.map((year) => (
              <AccordionItem value={year.id} key={year.id}>
                <div className="flex justify-between items-center w-full">
                    <AccordionTrigger className="text-lg font-medium flex-1">
                      <div className="flex items-center gap-2">
                            {year.isActive ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                          <span>{year.name}</span>
                      </div>
                    </AccordionTrigger>
                    {!year.isActive && (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActiveAcademicYear(year);}} className="mr-4">Set Active</Button>
                    )}
                </div>
                <AccordionContent className="space-y-4 pl-2">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                      <p className="text-muted-foreground text-sm">
                          Year runs from {format(year.startDate.toDate(), 'PPP')} to {format(year.endDate.toDate(), 'PPP')}.
                      </p>
                      {year.isActive && (
                          <div className="flex gap-2">
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" disabled={year.activeTermId === year.terms[year.terms.length - 1].id}>End Active Term</Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>End the current term?</AlertDialogTitle></AlertDialogHeader>
                                      <AlertDialogDescription>This will move the school to the next term. This cannot be undone.</AlertDialogDescription>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => endActiveTerm(year)}>Confirm</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                              <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="sm" disabled={year.activeTermId !== year.terms[year.terms.length - 1].id}>End Academic Year</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>End the Academic Year?</AlertDialogTitle></AlertDialogHeader>
                                      <AlertDialogDescription>This will mark the entire academic year as inactive. You will need to create and activate a new year to continue.</AlertDialogDescription>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => endAcademicYear(year)}>Confirm and End Year</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </div>
                      )}
                  </div>

                  <h4 className="font-semibold">Terms</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {year.terms.map(term => (
                      <Card key={term.id} className={cn(year.activeTermId === term.id && year.isActive ? "border-primary bg-primary/5" : "")}>
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-base">{term.name}</CardTitle>
                          {year.activeTermId === term.id && year.isActive && <Badge>Active Term</Badge>}
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                              <Label className="text-xs">Start Date</Label>
                              <Popover>
                                  <PopoverTrigger asChild>
                                  <Button size="sm" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !term.startDate && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {term.startDate ? format(term.startDate.toDate(), "PPP") : <span>Pick date</span>}
                                  </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={term.startDate.toDate()} onSelect={(date) => handleTermDateChange(year.id, term.id, date, 'startDate')} /></PopoverContent>
                              </Popover>
                          </div>
                            <div>
                              <Label className="text-xs">End Date</Label>
                              <Popover>
                                  <PopoverTrigger asChild>
                                  <Button size="sm" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !term.endDate && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {term.endDate ? format(term.endDate.toDate(), "PPP") : <span>Pick date</span>}
                                  </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={term.endDate.toDate()} onSelect={(date) => handleTermDateChange(year.id, term.id, date, 'endDate')} /></PopoverContent>
                              </Popover>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
