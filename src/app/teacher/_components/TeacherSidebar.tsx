"use client"

import Link from "next/link"
import {
  Home,
  ClipboardCheck,
  History,
  Megaphone, // Added Megaphone icon
} from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

export function TeacherSidebar() {
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
