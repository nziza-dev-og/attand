"use client"

import Link from "next/link"
import * as React from 'react'; // Added React import
import {
  Home,
  User,
  CalendarDays,
  BarChart3,
  BellRing,
  Loader2,
  Megaphone, // Added Megaphone icon
} from "lucide-react"
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Student, Parent } from '@/lib/types';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"


interface SidebarChild {
    id: string;
    name: string;
}

export function ParentSidebar() {
    const { user, loading: authLoading } = useAuth();
    const [children, setChildren] = useState<SidebarChild[]>([]);
    const [loadingChildren, setLoadingChildren] = useState(true);

     useEffect(() => {
        const fetchChildren = async () => {
            if (authLoading || !user) {
                if (!authLoading && !user) setLoadingChildren(false);
                return;
            }

            setLoadingChildren(true);
            try {
                const parentDocRef = doc(db, 'users', user.uid);
                const parentDocSnap = await getDoc(parentDocRef);

                if (parentDocSnap.exists() && parentDocSnap.data().role === 'Parent') {
                    const parentData = parentDocSnap.data() as Parent; 
                    const childIds = parentData.childIds || [];

                     if (childIds.length > 0) {
                         const childrenPromises = childIds.map(async (childId) => {
                            const studentDocRef = doc(db, 'users', childId);
                            const studentDocSnap = await getDoc(studentDocRef);
                            if (studentDocSnap.exists()) {
                                return { id: studentDocSnap.id, name: studentDocSnap.data().name || `Child ${childId.substring(0, 4)}` };
                            }
                            return null;
                         });
                         const resolvedChildren = (await Promise.all(childrenPromises)).filter(c => c !== null) as SidebarChild[];
                         setChildren(resolvedChildren);
                    } else {
                        setChildren([]);
                    }
                } else {
                    setChildren([]); 
                }
            } catch (error) {
                console.error("Error fetching children for sidebar:", error);
                setChildren([]); 
            } finally {
                setLoadingChildren(false);
            }
        };

        fetchChildren();
    }, [user, authLoading]);


   return (
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
         <TooltipProvider>
         <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/parent"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <Home className="h-5 w-5" />
                  <span className="sr-only">Dashboard</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Dashboard</TooltipContent>
            </Tooltip>

             {loadingChildren && (
                  <div className="flex h-9 w-9 items-center justify-center md:h-8 md:w-8">
                     <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
             )}

            {!loadingChildren && children.map(child => (
                <React.Fragment key={child.id}>
                 <Tooltip>
                     <TooltipTrigger asChild>
                         <Link
                             href={`/parent/child/${child.id}`} 
                             className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                             >
                             <User className="h-5 w-5" />
                             <span className="sr-only">{child.name}'s Details</span>
                         </Link>
                     </TooltipTrigger>
                     <TooltipContent side="right">{child.name}'s Details (Attendance)</TooltipContent>
                 </Tooltip>
                 <Tooltip>
                     <TooltipTrigger asChild>
                         <Link
                             href={`/parent/child/${child.id}/behavior-reports`}
                             className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                             >
                             <Megaphone className="h-5 w-5" />
                             <span className="sr-only">{child.name}'s Behavior Reports</span>
                         </Link>
                     </TooltipTrigger>
                     <TooltipContent side="right">{child.name}'s Behavior Reports</TooltipContent>
                 </Tooltip>
                 </React.Fragment>
             ))}
              {!loadingChildren && children.length === 0 && (
                 <Tooltip>
                    <TooltipTrigger asChild>
                       <div className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground md:h-8 md:w-8">
                           <User className="h-5 w-5 opacity-50" />
                       </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">No children linked</TooltipContent>
                 </Tooltip>
              )}

              {!loadingChildren && children.length > 0 && (
                 <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href="/parent/attendance"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                        >
                          <CalendarDays className="h-5 w-5" />
                          <span className="sr-only">View All Attendance</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">View All Attendance</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href="/parent/summary"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                        >
                          <BarChart3 className="h-5 w-5" />
                          <span className="sr-only">Attendance Summary</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">Attendance Summary</TooltipContent>
                    </Tooltip>
                 </>
              )}

              <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/parent/notifications"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <BellRing className="h-5 w-5" />
                  <span className="sr-only">Notifications</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Notifications</TooltipContent>
            </Tooltip>
          </nav>
          </TooltipProvider>
       </aside>
   )
}
