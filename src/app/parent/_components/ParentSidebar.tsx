
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

  const renderChildLinks = () => {
    if (loadingChildren) {
      return (
        <div className={cn(commonLinkClass, mobileLinkClass, "text-muted-foreground", isMobileSheet ? "" : "justify-center")}>
          <Loader2 className="h-5 w-5 animate-spin" /> {isMobileSheet ? translate('sidebarLoadingChildren') || "Loading children..." : ""}
        </div>
      );
    }

    if (children.length === 0) {
      return (
        <div className={cn(commonLinkClass, mobileLinkClass, "text-muted-foreground cursor-not-allowed", isMobileSheet ? "" : "justify-center")}>
          <User className="h-5 w-5 opacity-50" /> {isMobileSheet ? translate('sidebarNoChildrenLinked') || "No children linked" : ""}
        </div>
      );
    }

    if (children.length === 1) {
      const child = children[0];
      return (
        <>
          <Link href={`/parent/child/${child.id}`} className={cn(commonLinkClass, mobileLinkClass, isMobileSheet ? "" : "justify-center")}>
            <User className="h-5 w-5" /> {isMobileSheet ? translate("childDetails", {childName: child.name}) : ""}
            {!isMobileSheet && <span className="sr-only">{translate("childDetails", {childName: child.name})}</span>}
          </Link>
          <Link href={`/parent/child/${child.id}/behavior-reports`} className={cn(commonLinkClass, mobileLinkClass, isMobileSheet ? "ml-4" : "justify-center")}>
            <Megaphone className="h-5 w-5" /> {isMobileSheet ? translate("behaviorReports") : ""}
            {!isMobileSheet && <span className="sr-only">{translate("behaviorReports")} ({child.name})</span>}
          </Link>
        </>
      );
    }

    // More than 1 child
    return (
      <Link href="/parent/select-child" className={cn(commonLinkClass, mobileLinkClass, isMobileSheet ? "" : "justify-center")}>
        <Users className="h-5 w-5" /> {isMobileSheet ? translate("selectChild") : ""}
        {!isMobileSheet && <span className="sr-only">{translate("selectChild")}</span>}
      </Link>
    );
  };

  const renderChildTooltips = () => {
    if (loadingChildren) {
        return (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground md:h-8 md:w-8">
                <Loader2 className="h-5 w-5 animate-spin" />
            </div>
        );
    }
    if (children.length === 0) {
        return (
             <Tooltip>
                <TooltipTrigger asChild>
                   <div className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground md:h-8 md:w-8 cursor-not-allowed">
                       <User className="h-5 w-5 opacity-50" />
                   </div>
                </TooltipTrigger>
                <TooltipContent side="right">{translate('sidebarNoChildrenLinked')}</TooltipContent>
             </Tooltip>
        );
    }
    if (children.length === 1) {
        const child = children[0];
        return (
            <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link
                        href={`/parent/child/${child.id}`} 
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                        >
                        <User className="h-5 w-5" />
                        <span className="sr-only">{translate("childDetails", {childName: child.name})}</span>
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{translate("childDetails", {childName: child.name})} ({translate("attendance")})</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link
                        href={`/parent/child/${child.id}/behavior-reports`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                        >
                        <Megaphone className="h-5 w-5" />
                        <span className="sr-only">{translate("behaviorReports")} ({child.name})</span>
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{translate("behaviorReports")} ({child.name})</TooltipContent>
            </Tooltip>
            </>
        );
    }
    // More than 1 child
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href="/parent/select-child"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                    >
                    <Users className="h-5 w-5" />
                    <span className="sr-only">{translate("selectChild")}</span>
                </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{translate("selectChild")}</TooltipContent>
        </Tooltip>
    );
  }


  if (isMobileSheet) {
    return (
      <nav className="grid gap-2 p-4">
        <Link href="/parent" className={cn(commonLinkClass, mobileLinkClass)}>
          <Home className="h-5 w-5" /> {translate("dashboard")}
        </Link>
        {renderChildLinks()}
        {/* Global links always shown if children exist or not */}
        <Link href="/parent/attendance" className={cn(commonLinkClass, mobileLinkClass)}>
            <CalendarDays className="h-5 w-5" /> {translate("viewAllAttendance")}
        </Link>
        <Link href="/parent/summary" className={cn(commonLinkClass, mobileLinkClass)}>
            <BarChart3 className="h-5 w-5" /> {translate("attendanceSummary")}
        </Link>
        <Link href="/parent/notifications" className={cn(commonLinkClass, mobileLinkClass)}>
          <BellRing className="h-5 w-5" /> {translate("notifications")}
        </Link>
      </nav>
    );
  }

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
                  <span className="sr-only">{translate("dashboard")}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{translate("dashboard")}</TooltipContent>
            </Tooltip>

            {renderChildTooltips()}
            
            {/* Global links always shown */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/parent/attendance"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <CalendarDays className="h-5 w-5" />
                  <span className="sr-only">{translate("viewAllAttendance")}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{translate("viewAllAttendance")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/parent/summary"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <BarChart3 className="h-5 w-5" />
                  <span className="sr-only">{translate("attendanceSummary")}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{translate("attendanceSummary")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/parent/notifications"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <BellRing className="h-5 w-5" />
                  <span className="sr-only">{translate("notifications")}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{translate("notifications")}</TooltipContent>
            </Tooltip>
          </nav>
          </TooltipProvider>
       </aside>
   )
}

