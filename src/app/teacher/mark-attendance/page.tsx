import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar"; // Assuming Calendar component exists
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


// Mock Data - Replace with actual data fetching
const mockClasses = [
  { id: 'class1', name: 'Mathematics - Grade 10A' },
  { id: 'class2', name: 'Physics - Grade 11B' },
  { id: 'class3', name: 'History - Grade 9C' },
];

const mockStudents = {
  class1: [ { id: 's1', name: 'Alice Smith' }, { id: 's2', name: 'Bob Johnson' }, { id: 's3', name: 'Charlie Brown' } ],
  class2: [ { id: 's4', name: 'David Williams' }, { id: 's5', name: 'Eve Jones' } ],
  class3: [ { id: 's6', name: 'Frank Garcia' }, { id: 's7', name: 'Grace Miller' }, { id: 's8', name: 'Heidi Davis' } ],
};


// Client component needed for state management
"use client";
import * as React from "react";

export default function MarkAttendancePage() {
 const [selectedClass, setSelectedClass] = React.useState<string>('');
 const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
 const [attendance, setAttendance] = React.useState<Record<string, 'present' | 'absent' | 'late'>>({});

 const studentsToShow = selectedClass ? mockStudents[selectedClass as keyof typeof mockStudents] || [] : [];

 const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
 };

 const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting Attendance:", {
      classId: selectedClass,
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'N/A',
      records: attendance
    });
    // TODO: Implement actual submission logic to Firebase
    alert("Attendance submitted (check console for data). Implement actual Firebase submission.");
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
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger id="class-select">
                    <SelectValue placeholder="Choose a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClasses.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
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
                      />
                    </PopoverContent>
                  </Popover>
              </div>
           </div>

           {/* Student List */}
           {selectedClass && studentsToShow.length > 0 && (
             <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Students in {mockClasses.find(c => c.id === selectedClass)?.name}</h3>
                <div className="space-y-3">
                   {studentsToShow.map(student => (
                      <div key={student.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                         <span className="font-medium">{student.name}</span>
                         <div className="flex gap-2">
                             <Button
                                type="button"
                                variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleAttendanceChange(student.id, 'present')}
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

          {selectedClass && studentsToShow.length === 0 && (
             <p className="text-muted-foreground pt-4 border-t">No students found for this class.</p>
          )}


           {selectedClass && studentsToShow.length > 0 && (
              <div className="flex justify-end pt-4 border-t">
                 <Button type="submit">Submit Attendance</Button>
              </div>
           )}

        </form>
      </CardContent>
    </Card>
  );
}
