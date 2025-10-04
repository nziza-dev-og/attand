// src/lib/types.ts

import type { Timestamp } from "firebase/firestore";

export type Role = 'Admin' | 'Teacher' | 'Parent' | 'SuperAdmin' | null;

export interface UserProfile {
  uid: string;
  email?: string | null; // Made optional and nullable
  role: Role;
  name?: string; 
  schoolName?: string; 
  phoneNumber?: string; 
  createdAt: Timestamp;
  avatarUrl?: string;
  schoolIdentifierCode?: string; 
  enteredSchoolCode?: string; 
  isSchoolCodeVerified?: boolean; 
  assignedClassIds?: string[]; 
  schoolCodeVerificationAttempts?: number; 
  isSchoolCodeLocked?: boolean; 
  schoolId?: string | null; 
}

export interface Class {
  id: string; // Firestore document ID
  name: string; // e.g., "Grade 5 - Section A"
  teacherId?: string; // UID of the assigned teacher
  studentIds?: string[]; // Array of UIDs of students in the class
  schoolId: string; // UID of the Admin/School this class belongs to
  createdAt: Timestamp; // When the class was created
}

export interface Student extends UserProfile {
  role: 'Student';
  email: null; // Students explicitly have no email
  studentIdInfo?: string; // e.g., Roll number, Admission ID
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

export interface Advertisement {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  creatorId: string;
  creatorName: string; 
  creatorRole: Role;
  isActive: boolean;
  createdAt: Timestamp;
}
