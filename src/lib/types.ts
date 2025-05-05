// src/lib/types.ts

import type { Timestamp } from "firebase/firestore";

export type Role = 'Admin' | 'Teacher' | 'Parent';

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
  name?: string; // Optional: User's display name
  createdAt: Timestamp;
}

export interface Class {
  id: string; // Firestore document ID
  name: string; // e.g., "Mathematics - Grade 10A"
  subject?: string; // e.g., "Mathematics"
  gradeLevel?: string; // e.g., "10"
  schedule?: string; // e.g., "Mon, Wed 9:00 AM - 10:30 AM"
  teacherId?: string; // UID of the assigned teacher
  studentIds?: string[]; // Array of UIDs of students in the class
}

export interface Student {
  id: string; // Firestore document ID (usually same as user UID if students log in)
  name: string;
  studentInfo?: string; // e.g., Roll number, Admission ID
  classIds?: string[]; // IDs of classes the student is enrolled in
  parentIds?: string[]; // UIDs of linked parents
  avatarUrl?: string; // Optional profile picture URL
}

export interface Teacher {
    id: string; // Firestore document ID (user UID)
    name: string;
    email: string;
    assignedClassIds?: string[]; // IDs of classes the teacher is assigned to
}

export interface Parent {
    id: string; // Firestore document ID (user UID)
    name: string;
    email: string;
    childIds?: string[]; // UIDs of linked children (students)
}


export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  id: string; // Firestore document ID
  classId: string;
  studentId: string;
  date: string; // Store as 'YYYY-MM-DD' string for easier querying/filtering
  status: AttendanceStatus;
  markedBy: string; // Teacher's UID
  timestamp: Timestamp; // Firestore timestamp when marked
  notes?: string; // Optional notes from the teacher
}
