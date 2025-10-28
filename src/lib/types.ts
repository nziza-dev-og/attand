// src/lib/types.ts

import type { Timestamp } from "firebase/firestore";

export type Role = 'Admin' | 'Teacher' | 'Parent' | 'SuperAdmin' | null;

export interface UserProfile {
  uid: string;
  email?: string | null; 
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

export interface AcademicYear {
  id: string;
  name: string; // e.g., "2024-2025"
  startDate: Timestamp;
  endDate: Timestamp;
  schoolId: string;
  isActive: boolean; // Is this the current academic year for the school?
  activeTermId: string; // ID of the currently active term
  terms: Term[];
}

export interface Term {
  id: string; // e.g., "term1"
  name: string; // e.g., "Term 1"
  startDate: Timestamp;
  endDate: Timestamp;
  // Maps classId to an array of studentIds
  studentEnrollments: Record<string, string[]>;
}


export interface Class {
  id: string; // Firestore document ID
  name: string; // e.g., "Grade 5 - Section A"
  teacherId?: string; // UID of the assigned teacher
  schoolId: string; // UID of the Admin/School this class belongs to
  createdAt: Timestamp; // When the class was created
}

export interface Student extends UserProfile {
  role: 'Student';
  email: null; // Students explicitly have no email
  studentIdInfo?: string; 
  parentIds?: string[];
  schoolId: string; 
}

export interface Teacher extends UserProfile {
    role: 'Teacher';
    schoolId: string; 
}

export interface ParentNotificationPreferences {
  absenceAlerts?: boolean;
  lowAttendanceThreshold?: boolean; 
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
  schoolId: string; // schoolId of the school this record belongs to
  academicYearId: string; // Link to academic year
  termId: string; // Link to term
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
  studentName: string; 
  classId?: string; 
  reporterId: string; // UID of Admin or Teacher who reported
  reporterName: string; 
  reporterRole: 'Admin' | 'Teacher';
  reportDate: Timestamp; // Date of the incident
  title: string;
  description: string;
  severity?: BehaviorReportSeverity;
  createdAt: Timestamp; 
  parentNotifiedAt?: Timestamp; 
  seenByParentIds?: string[]; 
  parentResponses?: ParentResponse[];
  schoolId: string; 
  academicYearId: string; // Link to academic year
  termId: string; // Link to term
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

export type CallStatus = 'ringing' | 'answered' | 'declined' | 'ended' | 'missed';

export interface Call {
  id: string; // Firestore document ID
  callerId: string;
  callerName: string;
  calleeId: string; 
  studentId: string;
  studentName: string;
  status: CallStatus;
  createdAt: Timestamp;
  answeredAt?: Timestamp;
  endedAt?: Timestamp;
}
