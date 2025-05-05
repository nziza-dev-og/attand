"use client";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { LogOut, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <div className="flex items-center gap-2">
           <GraduationCap className="h-6 w-6 text-primary" />
           <h1 className="text-xl font-semibold text-primary">AttendEase</h1>
           <span className="text-xl font-light text-muted-foreground hidden sm:inline">| {title}</span>
        </div>
        <div className="ml-auto">
         <Button variant="outline" size="icon" onClick={handleLogout}>
           <LogOut className="h-4 w-4" />
           <span className="sr-only">Logout</span>
         </Button>
        </div>
    </header>
  );
}
