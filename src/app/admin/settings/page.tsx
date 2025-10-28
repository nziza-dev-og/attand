
// src/app/admin/settings/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, CalendarIcon, Settings } from "lucide-react";
import { format, isBefore } from "date-fns";
import type { AcademicYear, Term } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const { schoolId, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for new academic year dialog
  const [isAddYearOpen, setIsAddYearOpen] = useState(false);
  const [newYearName, setNewYearName] = useState("");
  const [newYearStartDate, setNewYearStartDate] = useState<Date | undefined>();
  const [newYearEndDate, setNewYearEndDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAcademicYears = async () => {
      if (!schoolId || authLoading) {
        if (!authLoading) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const q = query(collection(db, "academicYears"), where("schoolId", "==", schoolId));
        const querySnapshot = await getDocs(q);
        const years = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicYear));
        setAcademicYears(years);
      } catch (error) {
        console.error("Error fetching academic years:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load academic years." });
      } finally {
        setLoading(false);
      }
    };
    fetchAcademicYears();
  }, [schoolId, authLoading, toast]);

  const handleAddAcademicYear = async () => {
    if (!schoolId || !newYearName.trim() || !newYearStartDate || !newYearEndDate) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please provide a name, start date, and end date." });
      return;
    }
    if (isBefore(newYearEndDate, newYearStartDate)) {
       toast({ variant: "destructive", title: "Invalid Dates", description: "End date cannot be before the start date." });
       return;
    }

    setIsSubmitting(true);
    try {
      const yearDocRef = await addDoc(collection(db, "academicYears"), {
        name: newYearName.trim(),
        schoolId: schoolId,
        startDate: Timestamp.fromDate(newYearStartDate),
        endDate: Timestamp.fromDate(newYearEndDate),
        terms: [ // Auto-create 3 terms
            { id: 'term1', name: 'Term 1', startDate: Timestamp.fromDate(newYearStartDate), endDate: Timestamp.fromDate(newYearEndDate) },
            { id: 'term2', name: 'Term 2', startDate: Timestamp.fromDate(newYearStartDate), endDate: Timestamp.fromDate(newYearEndDate) },
            { id: 'term3', name: 'Term 3', startDate: Timestamp.fromDate(newYearStartDate), endDate: Timestamp.fromDate(newYearEndDate) },
        ]
      });
      setAcademicYears(prev => [...prev, {
          id: yearDocRef.id,
          name: newYearName.trim(),
          schoolId,
          startDate: Timestamp.fromDate(newYearStartDate),
          endDate: Timestamp.fromDate(newYearEndDate),
          terms: [
             { id: 'term1', name: 'Term 1', startDate: Timestamp.fromDate(newYearStartDate), endDate: Timestamp.fromDate(newYearEndDate) },
             { id: 'term2', name: 'Term 2', startDate: Timestamp.fromDate(newYearStartDate), endDate: Timestamp.fromDate(newYearEndDate) },
             { id: 'term3', name: 'Term 3', startDate: Timestamp.fromDate(newYearStartDate), endDate: Timestamp.fromDate(newYearEndDate) },
          ]
      }]);
      toast({ title: "Success", description: "Academic year created successfully." });
      setIsAddYearOpen(false);
      setNewYearName("");
      setNewYearStartDate(undefined);
      setNewYearEndDate(undefined);
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
    const year = academicYears[yearIndex];
    const termIndex = year.terms.findIndex(t => t.id === termId);
    if (termIndex === -1) return;

    const updatedTerms = [...year.terms];
    updatedTerms[termIndex] = { ...updatedTerms[termIndex], [dateType]: Timestamp.fromDate(newDate) };
    
    // Optimistic UI update
    const updatedYears = [...academicYears];
    updatedYears[yearIndex] = { ...year, terms: updatedTerms };
    setAcademicYears(updatedYears);

    try {
        const yearDocRef = doc(db, "academicYears", yearId);
        await updateDoc(yearDocRef, { terms: updatedTerms });
        toast({ title: "Term Updated", description: "Term date has been saved." });
    } catch (error) {
        console.error("Error updating term date:", error);
        toast({ variant: "destructive", title: "Update Failed", description: "Could not save the term date." });
        // Revert UI on error if needed
    }
  };

  if (loading || authLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!schoolId && !authLoading) {
      return <Card><CardContent className="p-6">Admin school context is missing. Cannot manage settings.</CardContent></Card>
  }

  return (
    <>
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
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="year-name">Academic Year Name</Label>
                        <Input id="year-name" value={newYearName} onChange={(e) => setNewYearName(e.target.value)} placeholder="e.g., 2024-2025"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !newYearStartDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {newYearStartDate ? format(newYearStartDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newYearStartDate} onSelect={setNewYearStartDate} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                         <div>
                            <Label>End Date</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !newYearEndDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {newYearEndDate ? format(newYearEndDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newYearEndDate} onSelect={setNewYearEndDate} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
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
                  <AccordionTrigger className="text-lg font-medium">{year.name}</AccordionTrigger>
                  <AccordionContent className="space-y-4 pl-2">
                    <p className="text-muted-foreground">
                        Year runs from {format(year.startDate.toDate(), 'PPP')} to {format(year.endDate.toDate(), 'PPP')}.
                    </p>
                    <h4 className="font-semibold">Terms</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {year.terms.map(term => (
                        <Card key={term.id}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{term.name}</CardTitle>
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
    </>
  );
}
