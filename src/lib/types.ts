
// src/lib/types.ts

import type { Timestamp } from "firebase/firestore";

export type Role = 'Admin' | 'Teacher' | 'Parent' | 'SuperAdmin' | null;

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
  name?: string; // Optional: User's display name
  createdAt: Timestamp;
  avatarUrl?: string;
  schoolIdentifierCode?: string; // For Admins to set their school's code
  enteredSchoolCode?: string; // For Teachers/Parents to enter when signing up
  isSchoolCodeVerified?: boolean; // Tracks if teacher's/parent's school code is validated
  assignedClassIds?: string[]; // For Teachers: IDs of classes they are assigned to
  schoolCodeVerificationAttempts?: number; // Number of attempts left for school code verification
  isSchoolCodeLocked?: boolean; // If true, teacher's school code verification is locked
  schoolId?: string | null; // UID of the Admin whose school this user belongs to (Admin's own UID for Admins). Null for SuperAdmins.
  // For Students, this is the schoolId they are enrolled in.
  // For Teachers, this is the schoolId they are verified with.
  // For Parents, this can be set if they enter a valid school code during signup.
}

export interface Class {
  id: string; // Firestore document ID
  name: string; // e.g., "Mathematics - Grade 10A"
  subject?: string; // e.g., "Mathematics"
  gradeLevel?: string; // e.g., "10"
  schedule?: string; // e.g., "Mon, Wed 9:00 AM - 10:30 AM"
  teacherId?: string; // UID of the assigned teacher
  studentIds?: string[]; // Array of UIDs of students in the class
  schoolId: string; // UID of the Admin/School this class belongs to
  createdAt: Timestamp; // When the class was created
}

export interface Student extends UserProfile {
  role: 'Student';
  studentInfo?: string; // e.g., Roll number, Admission ID
  classIds?: string[]; // IDs of classes the student is enrolled in
  parentIds?: string[]; // UIDs of linked parents
  schoolId: string; // Students must belong to a school
}

export interface Teacher extends UserProfile {
    role: 'Teacher';
    schoolId: string; // Teachers must belong to a school after verification
}

export interface ParentNotificationPreferences {
  absenceAlerts?: boolean;
  lowAttendanceThreshold?: boolean; // Placeholder, not fully implemented
  newBehaviorReport?: boolean;
}

export interface Parent extends UserProfile {
    role: 'Parent';
    childIds?: string[];
    notificationPreferences?: ParentNotificationPreferences;
    // schoolId can be null or set if they entered a valid school code at signup
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
  schoolId: string; // schoolId of the school this record belongs to
}

export type BehaviorReportSeverity = 'Minor' | 'Moderate' | 'Severe';

export interface ParentResponse {
  parentId: string;
  parentName: string;
  comment: string;
  respondedAt: Timestamp;
}

export interface BehaviorReport {
  id: string; // Firestore document ID
  studentId: string;
  studentName: string; // Denormalized for easier display
  classId?: string; // Optional: class context for the report
  reporterId: string; // UID of Admin or Teacher who reported
  reporterName: string; // Denormalized
  reporterRole: 'Admin' | 'Teacher';
  reportDate: Timestamp; // Date of the incident
  title: string;
  description: string;
  severity?: BehaviorReportSeverity;
  createdAt: Timestamp; // When the report was created in the system
  parentNotifiedAt?: Timestamp; // Optional: When parent was "notified"
  seenByParentIds?: string[]; // Optional: if tracking individual parent views
  parentResponses?: ParentResponse[];
  schoolId: string; // schoolId of the school this report belongs to
}
