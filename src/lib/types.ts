
// src/lib/types.ts

import type { Timestamp } from "firebase/firestore";

export type Role = 'Admin' | 'Teacher' | 'Parent';

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
  name?: string; // Optional: User's display name
  createdAt: Timestamp;
  avatarUrl?: string;
  schoolIdentifierCode?: string; // For Admins to set their school's code
  enteredSchoolCode?: string; // For Teachers to enter when signing up
  isSchoolCodeVerified?: boolean; // Tracks if teacher's school code is validated
  assignedClassIds?: string[];
  schoolCodeVerificationAttempts?: number; // Number of attempts left for school code verification
  isSchoolCodeLocked?: boolean; // If true, teacher's school code verification is locked
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

export interface Teacher extends UserProfile {
    role: 'Teacher';
    // `enteredSchoolCode` and `isSchoolCodeVerified` are inherited from UserProfile
    // `schoolCodeVerificationAttempts` and `isSchoolCodeLocked` are inherited
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
}
