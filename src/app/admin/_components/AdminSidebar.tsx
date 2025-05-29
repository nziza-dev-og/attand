
"use client"

import Link from "next/link"
import {
  Home,
  Users,
  School,
  ClipboardList,
  UserPlus,
  BookUser,
  UserCog,
  Megaphone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
   TooltipProvider,
} from "@/components/ui/tooltip"

interface AdminSidebarProps {
  isMobileSheet?: boolean;
}

export function AdminSidebar({ isMobileSheet = false }: AdminSidebarProps) {
  const commonLinkClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary";
  const mobileLinkClass = "text-lg font-medium text-foreground hover:text-primary";

  if (isMobileSheet) {
    return (
      <nav className="grid gap-2 p-4">
        <Link href="/admin" className={cn(commonLinkClass, mobileLinkClass)}>
          <Home className="h-5 w-5" /> Dashboard
        </Link>
        <Link href="/admin/classes" className={cn(commonLinkClass, mobileLinkClass)}>
          <School className="h-5 w-5" /> Manage Classes
        </Link>
        <Link href="/admin/students" className={cn(commonLinkClass, mobileLinkClass)}>
          <Users className="h-5 w-5" /> Manage Students
        </Link>
        <Link href="/admin/teachers" className={cn(commonLinkClass, mobileLinkClass)}>
          <UserCog className="h-5 w-5" /> Manage Teachers
        </Link>
        <Link href="/admin/parents" className={cn(commonLinkClass, mobileLinkClass)}>
          <BookUser className="h-5 w-5" /> Manage Parents
        </Link>
        <Link href="/admin/assignments" className={cn(commonLinkClass, mobileLinkClass)}>
          <UserPlus className="h-5 w-5" /> Assignments
        </Link>
        <Link href="/admin/reports" className={cn(commonLinkClass, mobileLinkClass)}>
          <ClipboardList className="h-5 w-5" /> Attendance Reports
        </Link>
        <Link href="/admin/behavior-reports" className={cn(commonLinkClass, mobileLinkClass)}>
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
                  href="/admin"
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
                  href="/admin/classes"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <School className="h-5 w-5" />
                  <span className="sr-only">Manage Classes</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Manage Classes</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/admin/students"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <Users className="h-5 w-5" />
                  <span className="sr-only">Manage Students</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Manage Students</TooltipContent>
            </Tooltip>
             <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/admin/teachers"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <UserCog className="h-5 w-5" />
                  <span className="sr-only">Manage Teachers</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Manage Teachers</TooltipContent>
            </Tooltip>
             <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/admin/parents"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <BookUser className="h-5 w-5" />
                  <span className="sr-only">Manage Parents</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Manage Parents</TooltipContent>
            </Tooltip>
             <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/admin/assignments"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <UserPlus className="h-5 w-5" />
                  <span className="sr-only">Assignments</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Assignments</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/admin/reports"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <ClipboardList className="h-5 w-5" />
                  <span className="sr-only">Attendance Reports</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Attendance Reports</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/admin/behavior-reports"
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
