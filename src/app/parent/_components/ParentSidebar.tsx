"use client"

import Link from "next/link"
import {
  Home,
  User,
  CalendarDays,
  BarChart3,
  BellRing, // Added for notifications
} from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

// Mock data - Replace with actual children data for the logged-in parent
const mockChildren = [
    { id: 'child1', name: 'Alice Smith' },
    { id: 'child2', name: 'Charlie Brown' },
];


export function ParentSidebar() {
   return (
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
         <TooltipProvider>
         <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
             {/* Dashboard Link */}
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

            {/* Links for each child */}
             {mockChildren.map(child => (
                 <Tooltip key={child.id}>
                     <TooltipTrigger asChild>
                         <Link
                             href={`/parent/child/${child.id}`} // Dynamic route per child
                             className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                             >
                             <User className="h-5 w-5" />
                             <span className="sr-only">{child.name}'s Attendance</span>
                         </Link>
                     </TooltipTrigger>
                     <TooltipContent side="right">{child.name}'s Attendance</TooltipContent>
                 </Tooltip>
             ))}

             {/* General Attendance View Link */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/parent/attendance"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <CalendarDays className="h-5 w-5" />
                  <span className="sr-only">View Attendance</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">View Attendance</TooltipContent>
            </Tooltip>

            {/* Summary/Stats Link */}
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

             {/* Notifications Link (Optional) */}
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
