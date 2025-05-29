
"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type Role = 'Admin' | 'Teacher' | 'Parent' | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
  isSchoolCodeVerified: boolean | null; // Added for teacher school code verification status
  enteredSchoolCode?: string | null; // Added to store teacher's entered school code
}

const defaultAuthContextValue: AuthContextType = {
  user: null,
  role: null,
  loading: true,
  isSchoolCodeVerified: null,
  enteredSchoolCode: null,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [isSchoolCodeVerified, setIsSchoolCodeVerified] = useState<boolean | null>(null);
  const [enteredSchoolCode, setEnteredSchoolCode] = useState<string | null>(null);

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
            if (userData.role === 'Admin' || userData.role === 'Teacher' || userData.role === 'Parent') {
              setRole(userData.role);
              setIsSchoolCodeVerified(userData.isSchoolCodeVerified === undefined ? null : userData.isSchoolCodeVerified);
              setEnteredSchoolCode(userData.enteredSchoolCode || null);

              // Admins are considered verified for their own school management
              if (userData.role === 'Admin') {
                setIsSchoolCodeVerified(true);
              }

            } else {
              console.warn("User document found, but role is invalid or missing:", userData.role);
              setRole(null);
              setIsSchoolCodeVerified(null);
              setEnteredSchoolCode(null);
            }
          } else {
            console.warn("User document not found for UID:", currentUser.uid);
            setRole(null);
            setIsSchoolCodeVerified(null);
            setEnteredSchoolCode(null);
          }
        } catch (error) {
          console.error("Error fetching user role/details:", error);
          setRole(null);
          setIsSchoolCodeVerified(null);
          setEnteredSchoolCode(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setIsSchoolCodeVerified(null);
        setEnteredSchoolCode(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, isSchoolCodeVerified, enteredSchoolCode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
