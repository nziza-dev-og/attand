
// src/app/teacher/behavior-reports/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp, doc } from "firebase/firestore";
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
import type { Student, BehaviorReportSeverity, Class } from "@/lib/types";

const reportSchema = z.object({
  studentId: z.string().min(1, { message: "Please select a student." }),
  classId: z.string().min(1, { message: "Please select a class." }), // Added classId
  reportDate: z.date({ required_error: "Please select the date of the incident." }),
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(100),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }).max(1000),
  severity: z.enum(["Minor", "Moderate", "Severe"]).optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface StudentSelectItem { id: string; name: string; }
interface ClassSelectItem { id: string; name: string; }

export default function TeacherBehaviorReportsPage() {
  const { user, schoolId, loading: authLoading } = useAuth();
  const [teacherClasses, setTeacherClasses] = useState<ClassSelectItem[]>([]);
  const [studentsInClass, setStudentsInClass] = useState<StudentSelectItem[]>([]);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportDate: new Date(),
    }
  });

  const selectedClassId = watch("classId");

  // Fetch teacher's classes
  useEffect(() => {
    const fetchTeacherClasses = async () => {
      if (!user || authLoading) return;
      setLoadingInitialData(true);
      try {
        const teacherDocRef = doc(db, 'users', user.uid);
        const teacherDocSnap = await getDoc(teacherDocRef);
        if (teacherDocSnap.exists() && teacherDocSnap.data().role === 'Teacher') {
          const assignedClassIds = teacherDocSnap.data().assignedClassIds || [];
          if (Array.isArray(assignedClassIds) && assignedClassIds.length > 0) {
            
            const classPromises = [];
            // Firestore 'in' query has a limit of 30. Batch if necessary.
            for (let i = 0; i < assignedClassIds.length; i += 30) {
                const batchIds = assignedClassIds.slice(i, i + 30);
                const classesQuery = query(collection(db, 'classes'), where('__name__', 'in', batchIds));
                classPromises.push(getDocs(classesQuery));
            }
            const classSnapshots = await Promise.all(classPromises);
            const classes: ClassSelectItem[] = [];
            classSnapshots.forEach(snapshot => {
                snapshot.docs.forEach(doc => {
                    classes.push({ id: doc.id, name: doc.data().name });
                });
            });
            setTeacherClasses(classes);

          } else {
            toast({ variant: "default", title: "No Classes", description: "You are not assigned to any classes to create reports for." });
            setTeacherClasses([]);
          }
        }
      } catch (err) {
        console.error("Error fetching teacher's classes:", err);
        toast({ variant: "destructive", title: "Error", description: "Failed to load your classes." });
      } finally {
        setLoadingInitialData(false);
      }
    };
    fetchTeacherClasses();
  }, [user, authLoading, toast]);

  // Fetch students when class selection changes
  useEffect(() => {
    const fetchStudentsInClass = async () => {
      if (!selectedClassId) {
        setStudentsInClass([]);
        setValue("studentId", ""); // Clear student selection
        return;
      }
      setLoadingStudents(true);
      setValue("studentId", ""); 
      try {
        const classDocRef = doc(db, "classes", selectedClassId);
        const classDocSnap = await getDoc(classDocRef);
        if (classDocSnap.exists()) {
          const studentIds = classDocSnap.data().studentIds || [];
          if (studentIds.length > 0) {
            if (studentIds.length > 30) console.warn("Class has >30 students");
            const studentsQuery = query(collection(db, 'users'), where('__name__', 'in', studentIds.slice(0, 30)), where('role', '==', 'Student'));
            const studentSnap = await getDocs(studentsQuery);
            setStudentsInClass(studentSnap.docs.map(d => ({ id: d.id, name: d.data().name || `Student (${d.id.substring(0,4)})` })));
          } else {
            setStudentsInClass([]);
          }
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to load students for the selected class." });
        setStudentsInClass([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudentsInClass();
  }, [selectedClassId, toast, setValue]);

  const onSubmit: SubmitHandler<ReportFormData> = async (data) => {
    if (!user || !user.email) return;

    if (!schoolId) {
      toast({ variant: "destructive", title: "Error", description: "Your account is not linked to a school. Cannot submit report." });
      return;
    }

    const selectedStudent = studentsInClass.find(s => s.id === data.studentId);
    if (!selectedStudent) {
        toast({ variant: "destructive", title: "Error", description: "Selected student not found." });
        return;
    }

    try {
      await addDoc(collection(db, "behaviorReports"), {
        studentId: data.studentId,
        studentName: selectedStudent.name,
        classId: data.classId, // Save class context
        reporterId: user.uid,
        reporterName: user.displayName || user.email,
        reporterRole: "Teacher",
        reportDate: Timestamp.fromDate(data.reportDate),
        title: data.title,
        description: data.description,
        severity: data.severity || null,
        createdAt: Timestamp.now(),
        schoolId: schoolId,
      });
      toast({ title: "Success", description: "Behavior report submitted successfully." });
      reset({ reportDate: new Date(), title: "", description: "", classId: data.classId, studentId: "", severity: undefined });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit report." });
    }
  };

  if (authLoading || loadingInitialData) {
    return <div className="flex justify-center items-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-2">Loading...</span></div>;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Megaphone className="h-6 w-6" />Create Behavior Report</CardTitle>
        <CardDescription>Document and submit a student behavior incident for your class.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="classId">Class</Label>
            <Controller
              name="classId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={teacherClasses.length === 0}>
                  <SelectTrigger id="classId" className={errors.classId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={teacherClasses.length === 0 ? "No classes assigned" : "Select a class"} />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherClasses.map(cls => (<SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.classId && <p className="text-xs text-destructive mt-1">{errors.classId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="studentId">Student</Label>
            <Controller
              name="studentId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedClassId || loadingStudents || studentsInClass.length === 0}>
                  <SelectTrigger id="studentId" className={errors.studentId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={loadingStudents ? "Loading students..." : (studentsInClass.length === 0 && selectedClassId ? "No students in class" : "Select a student")} />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsInClass.map(student => (<SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>))}
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
                    <Button id="reportDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.reportDate ? "border-destructive" : "")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
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
                  <SelectTrigger id="severity"><SelectValue placeholder="Select severity level" /></SelectTrigger>
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
          <Button type="submit" disabled={isSubmitting || !selectedClassId || studentsInClass.length === 0} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" /> Submit Report
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
