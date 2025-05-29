
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
import { useLanguage } from "@/contexts/LanguageContext";


interface AdminSidebarProps {
  isMobileSheet?: boolean;
}

export function AdminSidebar({ isMobileSheet = false }: AdminSidebarProps) {
  const { translate } = useLanguage();
  const commonLinkClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary";
  const mobileLinkClass = "text-lg font-medium text-foreground hover:text-primary";

  const navItems = [
    { href: "/admin", icon: Home, labelKey: "dashboard", srOnlyKey: "dashboard" },
    { href: "/admin/classes", icon: School, labelKey: "manageClasses", srOnlyKey: "manageClasses" },
    { href: "/admin/students", icon: Users, labelKey: "manageStudents", srOnlyKey: "manageStudents" },
    { href: "/admin/teachers", icon: UserCog, labelKey: "manageTeachers", srOnlyKey: "manageTeachers" },
    { href: "/admin/parents", icon: BookUser, labelKey: "manageParents", srOnlyKey: "manageParents" },
    { href: "/admin/assignments", icon: UserPlus, labelKey: "assignments", srOnlyKey: "assignments" },
    { href: "/admin/reports", icon: ClipboardList, labelKey: "attendanceReports", srOnlyKey: "attendanceReports" },
    { href: "/admin/behavior-reports", icon: Megaphone, labelKey: "behaviorReports", srOnlyKey: "behaviorReports" },
  ];

  if (isMobileSheet) {
    return (
      <nav className="grid gap-2 p-4">
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className={cn(commonLinkClass, mobileLinkClass)}>
            <item.icon className="h-5 w-5" /> {translate(item.labelKey)}
          </Link>
        ))}
      </nav>
    );
  }

   return (
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
         <TooltipProvider>
         <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          {navItems.map(item => (
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
