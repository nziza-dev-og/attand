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
}

// Provide a default value matching the context type
const defaultAuthContextValue: AuthContextType = {
  user: null,
  role: null,
  loading: true,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            // Assuming 'role' is a field in the user document
            const userData = userDocSnap.data();
             if (userData.role === 'Admin' || userData.role === 'Teacher' || userData.role === 'Parent') {
                setRole(userData.role);
             } else {
                console.warn("User document found, but role is invalid or missing:", userData.role);
                setRole(null); // Handle invalid or missing role
             }
          } else {
            console.warn("User document not found for UID:", user.uid);
            setRole(null); // No user document, no role
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole(null); // Error fetching role
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    // Removed incorrect generic type annotation from AuthContext.Provider
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
