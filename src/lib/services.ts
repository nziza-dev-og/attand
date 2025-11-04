// src/lib/services.ts
/**
 * @fileoverview This file centralizes database interaction logic (services)
 * to be used by both UI components and AI tools, ensuring consistency.
 */

import { collection, addDoc, getDocs, query, where, Timestamp, doc, writeBatch, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AttendanceRecord, Class, Student } from './types';
import { format } from "date-fns";

// --- Attendance Services ---

interface ReportFilters {
  schoolId: string;
  classId?: string;
  studentId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export async function getAttendanceReport(filters: ReportFilters): Promise<AttendanceRecord[]> {
    const { schoolId, classId, studentId, startDate, endDate } = filters;

    if (!schoolId) {
        throw new Error("School ID is required to fetch attendance reports.");
    }
    
    let qConstraints = [where("schoolId", "==", schoolId)];

    if (classId) qConstraints.push(where("classId", "==", classId));
    if (studentId) qConstraints.push(where("studentId", "==", studentId));
    if (startDate) qConstraints.push(where("timestamp", ">=", Timestamp.fromDate(new Date(startDate))));
    if (endDate) qConstraints.push(where("timestamp", "<=", Timestamp.fromDate(new Date(endDate))));

    const attendanceQuery = query(collection(db, "attendanceRecords"), ...qConstraints);
    const snapshot = await getDocs(attendanceQuery);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
}


// --- Student Services ---

interface AddStudentInput {
    schoolId: string;
    academicYearId: string;
    termId: string;
    name: string;
    classId?: string;
    studentIdInfo?: string;
}

interface AddStudentOutput {
    studentId: string;
    name: string;
    className?: string;
}

export async function addStudent(input: AddStudentInput): Promise<AddStudentOutput> {
    const { schoolId, academicYearId, termId, name, classId, studentIdInfo } = input;

    if (!schoolId || !academicYearId || !termId) {
        throw new Error("School context (schoolId, academicYearId, termId) is required to add a student.");
    }

    const batch = writeBatch(db);
    const studentDocRef = doc(collection(db, "users"));

    const studentData: Omit<Student, 'id' | 'uid' | 'email'> = {
        name: name,
        role: "Student",
        studentIdInfo: studentIdInfo || undefined,
        createdAt: Timestamp.now(),
        parentIds: [],
        schoolId: schoolId,
    };
    batch.set(studentDocRef, studentData);

    let className: string | undefined = undefined;

    if (classId && classId !== 'none_class_option') {
        const yearDocRef = doc(db, "academicYears", academicYearId);
        const fieldToUpdate = `terms.${termId}.studentEnrollments.${classId}`;
        batch.update(yearDocRef, {
            [fieldToUpdate]: arrayUnion(studentDocRef.id)
        });
        
        // For the response, get the class name
        const classDoc = await getDocs(query(collection(db, 'classes'), where('__name__', '==', classId)));
        if (!classDoc.empty) {
            className = classDoc.docs[0].data().name;
        }
    }

    await batch.commit();

    return {
        studentId: studentDocRef.id,
        name: name,
        className: className,
    };
}
