
"use client"

import Link from "next/link"
import * as React from 'react'; 
import {
  Home,
  User,
  Users, // Added for multiple children
  CalendarDays,
  BarChart3,
  BellRing,
  Loader2,
  Megaphone,
  UserCircle, // New Icon for Profile
} from "lucide-react"
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Student, Parent } from '@/lib/types';
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { useLanguage } from "@/contexts/LanguageContext";


interface SidebarChild {
    id: string;
    name: string;
}

interface ParentSidebarProps {
  isMobileSheet?: boolean;
}

export function ParentSidebar({ isMobileSheet = false }: ParentSidebarProps) {
    const { user, loading: authLoading } = useAuth();
    const { translate } = useLanguage();
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

  const commonLinkClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary";
  const mobileLinkClass = "text-lg font-medium text-foreground hover:text-primary";

  const baseNavItems = [
     { href: "/parent", icon: Home, labelKey: "dashboard", srOnlyKey: "dashboard" },
  ];

  const childSpecificNavItems = () => {
    if (loadingChildren) {
      return [{ type: 'loader', icon: Loader2, labelKey: 'sidebarLoadingChildren' }];
    }
    if (children.length === 0) {
      return [{ type: 'placeholder', icon: User, labelKey: 'sidebarNoChildrenLinked' }];
    }
    if (children.length === 1) {
      const child = children[0];
      return [
        { type: 'link', href: `/parent/child/${child.id}`, icon: User, labelKey: "childDetails", labelParams: {childName: child.name}, srOnlyKey: "childDetails", srOnlyParams: {childName: child.name} },
        { type: 'link', href: `/parent/child/${child.id}/behavior-reports`, icon: Megaphone, labelKey: "behaviorReports", srOnlyKey: "behaviorReports", srOnlyParams: {childName: child.name}, isSubItem: isMobileSheet }
      ];
    }
    return [{ type: 'link', href: "/parent/select-child", icon: Users, labelKey: "selectChild", srOnlyKey: "selectChild" }];
  };

  const globalNavItems = [
    { href: "/parent/attendance", icon: CalendarDays, labelKey: "viewAllAttendance", srOnlyKey: "viewAllAttendance" },
    { href: "/parent/summary", icon: BarChart3, labelKey: "attendanceSummary", srOnlyKey: "attendanceSummary" },
    { href: "/parent/notifications", icon: BellRing, labelKey: "notifications", srOnlyKey: "notifications" },
    { href: "/profile", icon: UserCircle, labelKey: "myProfileTitle", srOnlyKey: "myProfileTitle"}, // New Profile Link
  ];


  if (isMobileSheet) {
    const mobileItems = [
      ...baseNavItems,
      ...childSpecificNavItems().map(item => {
        if (item.type === 'link') return { ...item, label: translate(item.labelKey, item.labelParams) };
        if (item.type === 'loader') return { ...item, label: translate(item.labelKey) || "Loading..." };
        if (item.type === 'placeholder') return { ...item, label: translate(item.labelKey) || "No children" };
        return item;
      }),
      ...globalNavItems
    ];
    return (
      <nav className="grid gap-2 p-4">
        {mobileItems.map((item: any, index: number) => {
          if (item.type === 'link') {
            return (
              <Link key={item.href || index} href={item.href} className={cn(commonLinkClass, mobileLinkClass, item.isSubItem ? "ml-4" : "")}>
                <item.icon className={cn("h-5 w-5", item.type === 'loader' ? 'animate-spin' : '')} /> {item.label || translate(item.labelKey, item.labelParams)}
              </Link>
            );
          }
          if (item.type === 'loader' || item.type === 'placeholder') {
             return (
                <div key={index} className={cn(commonLinkClass, mobileLinkClass, "text-muted-foreground", item.type === 'placeholder' ? 'cursor-not-allowed' : '')}>
                    <item.icon className={cn("h-5 w-5", item.type === 'loader' ? 'animate-spin' : 'opacity-50')} /> {item.label}
                </div>
             );
          }
          return null;
        })}
      </nav>
    );
  }

   return (
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
         <TooltipProvider>
         <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
            {baseNavItems.map(item => (
                <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                    <Link
                    href={item.href}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                    >
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{translate(item.srOnlyKey)}</span>
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{translate(item.labelKey)}</TooltipContent>
                </Tooltip>
            ))}

            {childSpecificNavItems().map((item: any, index: number) => {
                 if (item.type === 'link') {
                     return (
                        <Tooltip key={item.href || index}>
                        <TooltipTrigger asChild>
                            <Link
                            href={item.href}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                            >
                            <item.icon className="h-5 w-5" />
                            <span className="sr-only">{translate(item.srOnlyKey, item.srOnlyParams)}</span>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{translate(item.labelKey, item.labelParams)}</TooltipContent>
                        </Tooltip>
                     );
                 }
                 if (item.type === 'loader') {
                    return (
                        <div key={index} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground md:h-8 md:w-8">
                            <item.icon className="h-5 w-5 animate-spin" />
                        </div>
                    );
                 }
                  if (item.type === 'placeholder') {
                     return (
                         <Tooltip key={index}>
                            <TooltipTrigger asChild>
                               <div className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground md:h-8 md:w-8 cursor-not-allowed">
                                   <item.icon className="h-5 w-5 opacity-50" />
                               </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">{translate(item.labelKey)}</TooltipContent>
                         </Tooltip>
                     );
                 }
                 return null;
            })}
            
            {globalNavItems.map(item => (
                <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                    <Link
                    href={item.href}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                    >
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{translate(item.srOnlyKey)}</span>
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{translate(item.labelKey)}</TooltipContent>
                </Tooltip>
            ))}
          </nav>
          </TooltipProvider>
       </aside>
   )
}
