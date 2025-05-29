// src/app/admin/behavior-reports/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, Megaphone, Send } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Student, BehaviorReportSeverity } from "@/lib/types";

const reportSchema = z.object({
  studentId: z.string().min(1, { message: "Please select a student." }),
  reportDate: z.date({ required_error: "Please select the date of the incident." }),
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(100),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }).max(1000),
  severity: z.enum(["Minor", "Moderate", "Severe"]).optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface StudentSelectItem {
  id: string;
  name: string;
}

export default function AdminBehaviorReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<StudentSelectItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const { toast } = useToast();

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportDate: new Date(),
    }
  });

  useEffect(() => {
    const fetchStudents = async () => {
      if (authLoading) return;
      setLoadingStudents(true);
      try {
        const q = query(collection(db, "users"), where("role", "==", "Student"));
        const querySnapshot = await getDocs(q);
        const studentList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || `Student (${doc.id.substring(0, 4)})`,
        }));
        setStudents(studentList);
      } catch (err) {
        console.error("Error fetching students:", err);
        toast({ variant: "destructive", title: "Error", description: "Failed to load students." });
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [authLoading, toast]);

  const onSubmit: SubmitHandler<ReportFormData> = async (data) => {
    if (!user || user.email === null) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to submit a report." });
      return;
    }

    const selectedStudent = students.find(s => s.id === data.studentId);
    if (!selectedStudent) {
        toast({ variant: "destructive", title: "Error", description: "Selected student not found." });
        return;
    }

    try {
      await addDoc(collection(db, "behaviorReports"), {
        studentId: data.studentId,
        studentName: selectedStudent.name,
        reporterId: user.uid,
        reporterName: user.displayName || user.email,
        reporterRole: "Admin",
        reportDate: Timestamp.fromDate(data.reportDate),
        title: data.title,
        description: data.description,
        severity: data.severity || null,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Success", description: "Behavior report submitted successfully." });
      reset({ reportDate: new Date(), title: "", description: "", studentId: "", severity: undefined });
    } catch (err: any) {
      console.error("Error submitting report:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to submit report." });
    }
  };

  if (authLoading || loadingStudents) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Megaphone className="h-6 w-6" />Create Behavior Report</CardTitle>
        <CardDescription>Document and submit a student behavior incident.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="studentId">Student</Label>
            <Controller
              name="studentId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={students.length === 0}>
                  <SelectTrigger id="studentId" className={errors.studentId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={students.length === 0 ? "No students available" : "Select a student"} />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(student => (
                      <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.studentId && <p className="text-xs text-destructive mt-1">{errors.studentId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportDate">Date of Incident</Label>
            <Controller
              name="reportDate"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="reportDate"
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.reportDate ? "border-destructive" : "")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.reportDate && <p className="text-xs text-destructive mt-1">{errors.reportDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title / Summary</Label>
            <Input id="title" {...register("title")} className={errors.title ? 'border-destructive' : ''} placeholder="e.g., Classroom disruption" />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description</Label>
            <Textarea id="description" {...register("description")} className={errors.description ? 'border-destructive' : ''} placeholder="Provide a full account of the incident..." rows={5} />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severity (Optional)</Label>
            <Controller
              name="severity"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="severity">
                    <SelectValue placeholder="Select severity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Minor">Minor</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting || students.length === 0} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" /> Submit Report
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
