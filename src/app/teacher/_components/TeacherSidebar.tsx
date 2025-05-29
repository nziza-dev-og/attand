
"use client"

import Link from "next/link"
import {
  Home,
  ClipboardCheck,
  History,
  Megaphone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

interface TeacherSidebarProps {
  isMobileSheet?: boolean;
}

export function TeacherSidebar({ isMobileSheet = false }: TeacherSidebarProps) {
  const commonLinkClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary";
  const mobileLinkClass = "text-lg font-medium text-foreground hover:text-primary";

  if (isMobileSheet) {
    return (
      <nav className="grid gap-2 p-4">
        <Link href="/teacher" className={cn(commonLinkClass, mobileLinkClass)}>
          <Home className="h-5 w-5" /> Dashboard
        </Link>
        <Link href="/teacher/mark-attendance" className={cn(commonLinkClass, mobileLinkClass)}>
          <ClipboardCheck className="h-5 w-5" /> Mark Attendance
        </Link>
        <Link href="/teacher/history" className={cn(commonLinkClass, mobileLinkClass)}>
          <History className="h-5 w-5" /> Attendance History
        </Link>
        <Link href="/teacher/behavior-reports" className={cn(commonLinkClass, mobileLinkClass)}>
          <Megaphone className="h-5 w-5" /> Behavior Reports
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
                  href="/teacher"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <Home className="h-5 w-5" />
                  <span className="sr-only">Dashboard</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Dashboard</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/teacher/mark-attendance"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <ClipboardCheck className="h-5 w-5" />
                  <span className="sr-only">Mark Attendance</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Mark Attendance</TooltipContent>
            </Tooltip>
             <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/teacher/history"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <History className="h-5 w-5" />
                  <span className="sr-only">Attendance History</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Attendance History</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/teacher/behavior-reports"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <Megaphone className="h-5 w-5" />
                  <span className="sr-only">Behavior Reports</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Behavior Reports</TooltipContent>
            </Tooltip>
          </nav>
          </TooltipProvider>
       </aside>
   )
}
