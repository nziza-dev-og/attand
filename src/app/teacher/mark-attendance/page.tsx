import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar"; // Assuming Calendar component exists
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { useAuth } from '@/hooks/useAuth';
import { collection, getDocs, query, where, addDoc, Timestamp, getDoc, doc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

// Client component needed for state management
"use client";
import * as React from "react";
import type { Class, Student, AttendanceRecord } from "@/lib/types";

interface SelectClassType { id: string; name: string; }
interface SelectStudentType { id: string; name: string; }

type AttendanceStatus = 'present' | 'absent' | 'late';


export default function MarkAttendancePage() {
 const { user, loading: authLoading } = useAuth();
 const [teacherClasses, setTeacherClasses] = React.useState<SelectClassType[]>([]);
 const [classStudents, setClassStudents] = React.useState<SelectStudentType[]>([]);
 const [selectedClass, setSelectedClass] = React.useState<string>(''); // Keep empty for controlled component
 const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
 const [attendance, setAttendance] = React.useState<Record<string, AttendanceStatus>>({});
 const [loadingClasses, setLoadingClasses] = React.useState(true);
 const [loadingStudents, setLoadingStudents] = React.useState(false);
 const [isSubmitting, setIsSubmitting] = React.useState(false);
 const { toast } = useToast();

 // Fetch teacher's classes
 React.useEffect(() => {
    const fetchClasses = async () => {
        if (!user || authLoading) return;
        setLoadingClasses(true);
        try {
            // Assuming teacher's assignedClassIds are stored on the user document
            const teacherDocRef = doc(db, 'users', user.uid);
            const teacherDocSnap = await getDoc(teacherDocRef);

            if (teacherDocSnap.exists() && teacherDocSnap.data().role === 'Teacher') {
                const assignedClassIds = teacherDocSnap.data().assignedClassIds || [];
                if (assignedClassIds.length > 0) {
                    // Fetch class details based on IDs
                    // Using 'in' query (max 30 IDs per query in Firestore v9+)
                     if (assignedClassIds.length > 30) console.warn("Teacher assigned to more than 30 classes, query might need batching.");

                     const classesQuery = query(collection(db, 'classes'), where('__name__', 'in', assignedClassIds.slice(0, 30)));
                     const classSnap = await getDocs(classesQuery);
                     const classes = classSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name } as SelectClassType));
                     setTeacherClasses(classes);
                 } else {
                    setTeacherClasses([]);
                    toast({ variant: "destructive", title: "No Classes", description: "You are not assigned to any classes." });
                 }
            } else {
                 setTeacherClasses([]);
                 toast({ variant: "destructive", title: "Error", description: "Could not find teacher profile." });
            }

        } catch (error) {
            console.error("Error fetching teacher classes:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load your classes." });
        } finally {
            setLoadingClasses(false);
        }
    };
    fetchClasses();
 }, [user, authLoading, toast]);


 // Fetch students when class selection changes
 React.useEffect(() => {
     const fetchStudents = async () => {
         // Only fetch if a class is selected (and it's not the placeholder value)
         if (!selectedClass || selectedClass === 'none') {
             setClassStudents([]);
             setAttendance({}); // Clear previous attendance when class changes
             return;
         }

         setLoadingStudents(true);
         setAttendance({}); // Clear previous attendance
         try {
             // Fetch the class document to get studentIds
             const classDocRef = doc(db, "classes", selectedClass);
             const classDocSnap = await getDoc(classDocRef);

             if (classDocSnap.exists()) {
                 const classData = classDocSnap.data();
                 const studentIds = classData.studentIds || [];

                 if (studentIds.length > 0) {
                      // Fetch student details based on IDs
                      // Using 'in' query (max 30 IDs) - Ensure you have Firestore indexes!
                       if (studentIds.length > 30) console.warn("Class has more than 30 students, query might need batching.");

                       const studentsQuery = query(collection(db, 'users'), where('__name__', 'in', studentIds.slice(0, 30)), where('role', '==', 'Student'));
                       const studentSnap = await getDocs(studentsQuery);
                       const students = studentSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name || 'Unnamed Student' } as SelectStudentType));
                       setClassStudents(students);

                       // Initialize attendance state for fetched students (e.g., default to 'present')
                       const initialAttendance = students.reduce((acc, student) => {
                           acc[student.id] = 'present'; // Default to present
                           return acc;
                       }, {} as Record<string, AttendanceStatus>);
                       setAttendance(initialAttendance);

                 } else {
                     setClassStudents([]);
                 }
             } else {
                 setClassStudents([]);
                 toast({ variant: "destructive", title: "Error", description: "Selected class data not found." });
             }
         } catch (error) {
             console.error("Error fetching students for class:", error);
             toast({ variant: "destructive", title: "Error", description: "Failed to load students for the selected class." });
             setClassStudents([]);
         } finally {
             setLoadingStudents(false);
         }
     };
     fetchStudents();
 }, [selectedClass, toast]);


 const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
 };

 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || selectedClass === 'none') {
       toast({ variant: "destructive", title: "Error", description: "Please select a class." });
       return;
    }
    if (!selectedDate) {
       toast({ variant: "destructive", title: "Error", description: "Please select a date." });
       return;
    }
     if (Object.keys(attendance).length === 0) {
         toast({ variant: "destructive", title: "Error", description: "No students to mark attendance for in this class." });
         return;
     }

     setIsSubmitting(true);
     const dateStr = format(selectedDate, 'yyyy-MM-dd');
     const submissionTimestamp = Timestamp.now();

    try {
        // Submit attendance records to Firebase
        // Consider using a batch write for efficiency
        const promises = Object.entries(attendance).map(([studentId, status]) => {
           return addDoc(collection(db, "attendanceRecords"), {
               classId: selectedClass,
               studentId: studentId,
               date: dateStr, // Store date as YYYY-MM-DD string
               status: status,
               markedBy: user?.uid, // Store teacher's UID
               timestamp: submissionTimestamp, // Firestore timestamp
               notes: "" // Add notes field if needed later
           } as Omit<AttendanceRecord, 'id'>); // Type assertion for Firestore data
        });

        await Promise.all(promises);

        toast({ title: "Success", description: `Attendance for ${dateStr} submitted successfully.` });
        // Optionally clear form or redirect
        // setAttendance({}); // Maybe keep the state to allow quick edits?

    } catch (error) {
         console.error("Error submitting attendance:", error);
         toast({ variant: "destructive", title: "Submission Failed", description: "Could not save attendance records. Please try again." });
    } finally {
        setIsSubmitting(false);
    }
 };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Mark Attendance</CardTitle>
        <CardDescription>Select a class and date, then mark each student's status.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Class Selector */}
             <div className="space-y-2">
                <Label htmlFor="class-select">Select Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass} disabled={loadingClasses || !user}>
                  <SelectTrigger id="class-select" disabled={loadingClasses}>
                    {/* Placeholder updated */}
                    <SelectValue placeholder={loadingClasses ? "Loading classes..." : "Choose a class..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Use a non-empty value like 'none' for the placeholder item */}
                    <SelectItem value="none" disabled>Choose a class...</SelectItem>
                    {teacherClasses.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                    {!loadingClasses && teacherClasses.length === 0 && (
                         <SelectItem value="no-classes" disabled>No classes assigned</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Picker */}
              <div className="space-y-2">
                 <Label htmlFor="date-picker">Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-picker"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        // Optional: Disable future dates?
                        // disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
              </div>
           </div>

           {/* Student List */}
            {loadingStudents && (
                 <div className="flex justify-center items-center py-10">
                     <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                     <span className="ml-2">Loading students...</span>
                 </div>
            )}
           {!loadingStudents && selectedClass && selectedClass !== 'none' && classStudents.length > 0 && (
             <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Students in {teacherClasses.find(c => c.id === selectedClass)?.name}</h3>
                <div className="space-y-3">
                   {classStudents.map(student => (
                      <div key={student.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                         <span className="font-medium">{student.name}</span>
                         <div className="flex gap-2">
                             <Button
                                type="button"
                                variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleAttendanceChange(student.id, 'present')}
                                // Use explicit colors matching theme or desired look
                                className={attendance[student.id] === 'present' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                              >
                                Present
                             </Button>
                             <Button
                                type="button"
                                variant={attendance[student.id] === 'absent' ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={() => handleAttendanceChange(student.id, 'absent')}
                             >
                                Absent
                             </Button>
                             <Button
                               type="button"
                               variant={attendance[student.id] === 'late' ? 'default' : 'outline'}
                               size="sm"
                               onClick={() => handleAttendanceChange(student.id, 'late')}
                               // Use explicit colors matching theme or desired look
                               className={attendance[student.id] === 'late' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                             >
                               Late
                             </Button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           )}

          {!loadingStudents && selectedClass && selectedClass !== 'none' && classStudents.length === 0 && (
             <p className="text-muted-foreground pt-4 border-t text-center">No students found enrolled in this class.</p>
          )}


           {!loadingStudents && selectedClass && selectedClass !== 'none' && classStudents.length > 0 && (
              <div className="flex justify-end pt-4 border-t">
                 <Button type="submit" disabled={isSubmitting || authLoading}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Submit Attendance
                 </Button>
              </div>
           )}

        </form>
      </CardContent>
    </Card>
  );
}
