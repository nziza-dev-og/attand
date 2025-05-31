
"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type Role = 'Admin' | 'Teacher' | 'Parent' | 'SuperAdmin' | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
  isSchoolCodeVerified: boolean | null;
  enteredSchoolCode?: string | null;
  schoolCodeVerificationAttempts?: number | null;
  isSchoolCodeLocked?: boolean | null;
  schoolId?: string | null; 
}

const defaultAuthContextValue: AuthContextType = {
  user: null,
  role: null,
  loading: true,
  isSchoolCodeVerified: null,
  enteredSchoolCode: null,
  schoolCodeVerificationAttempts: null,
  isSchoolCodeLocked: null,
  schoolId: null, 
};

const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [isSchoolCodeVerified, setIsSchoolCodeVerified] = useState<boolean | null>(null);
  const [enteredSchoolCode, setEnteredSchoolCode] = useState<string | null>(null);
  const [schoolCodeVerificationAttempts, setSchoolCodeVerificationAttempts] = useState<number | null>(null);
  const [isSchoolCodeLocked, setIsSchoolCodeLocked] = useState<boolean | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null); 


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.role === 'Admin' || userData.role === 'Teacher' || userData.role === 'Parent' || userData.role === 'SuperAdmin') {
              setRole(userData.role);
              setSchoolId(userData.schoolId || null); 
              setIsSchoolCodeVerified(userData.isSchoolCodeVerified === undefined ? null : userData.isSchoolCodeVerified);
              setEnteredSchoolCode(userData.enteredSchoolCode || null);
              setSchoolCodeVerificationAttempts(userData.schoolCodeVerificationAttempts === undefined ? null : userData.schoolCodeVerificationAttempts);
              setIsSchoolCodeLocked(userData.isSchoolCodeLocked === undefined ? null : userData.isSchoolCodeLocked);


              if (userData.role === 'Admin') {
                setIsSchoolCodeVerified(true);
              }
              if (userData.role === 'SuperAdmin') {
                setIsSchoolCodeVerified(true); // SuperAdmins are always "verified" in their context
                setSchoolId(null); // SuperAdmins don't have a specific schoolId
              }

            } else {
              console.warn("User document found, but role is invalid or missing:", userData.role);
              setRole(null);
              setSchoolId(null);
              setIsSchoolCodeVerified(null);
              setEnteredSchoolCode(null);
              setSchoolCodeVerificationAttempts(null);
              setIsSchoolCodeLocked(null);
            }
          } else {
            console.warn("User document not found for UID:", currentUser.uid);
            setRole(null);
            setSchoolId(null);
            setIsSchoolCodeVerified(null);
            setEnteredSchoolCode(null);
            setSchoolCodeVerificationAttempts(null);
            setIsSchoolCodeLocked(null);
          }
        } catch (error) {
          console.error("Error fetching user role/details:", error);
          setRole(null);
          setSchoolId(null);
          setIsSchoolCodeVerified(null);
          setEnteredSchoolCode(null);
          setSchoolCodeVerificationAttempts(null);
          setIsSchoolCodeLocked(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setSchoolId(null);
        setIsSchoolCodeVerified(null);
        setEnteredSchoolCode(null);
        setSchoolCodeVerificationAttempts(null);
        setIsSchoolCodeLocked(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, isSchoolCodeVerified, enteredSchoolCode, schoolCodeVerificationAttempts, isSchoolCodeLocked, schoolId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
