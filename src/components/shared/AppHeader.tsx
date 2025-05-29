
"use client";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { LogOut, GraduationCap, PanelLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";
import type { ReactNode } from 'react';

interface AppHeaderProps {
  title: string;
  navLinksComponent?: ReactNode;
  homePath?: string;
}

export function AppHeader({ title, navLinksComponent, homePath = "/" }: AppHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    } catch (error: any) {
      console.error("Logout failed:", error);
       toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:py-4 justify-between">
      {/* Left section: Mobile menu trigger and/or Desktop logo/title */}
      <div className="flex items-center gap-2">
        {navLinksComponent && (
          <div className="sm:hidden"> {/* Mobile menu trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 flex flex-col">
                <Link href={homePath} className="flex items-center gap-2 border-b px-4 py-3.5 mb-2">
                   <GraduationCap className="h-6 w-6 text-primary" />
                   <span className="text-lg font-semibold text-primary">AttendEase</span>
                </Link>
                <div className="flex-grow overflow-y-auto">
                  {navLinksComponent}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {/* Desktop Logo & App Name */}
        <Link href={homePath} className="hidden items-center gap-2 sm:flex">
           <GraduationCap className="h-6 w-6 text-primary" />
           <h1 className="text-xl font-semibold text-primary">AttendEase</h1>
        </Link>
        {/* Desktop Page Title */}
        <span className="text-xl font-light text-muted-foreground hidden sm:inline">| {title}</span>
      </div>

      {/* Mobile Page Title - Centered */}
      <h1 className="text-lg font-semibold sm:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{title}</h1>
      
      {/* Right section: Logout button */}
      <div>
         <Button variant="outline" size="icon" onClick={handleLogout}>
           <LogOut className="h-4 w-4" />
           <span className="sr-only">Logout</span>
         </Button>
      </div>
    </header>
  );
}
