
"use client";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { LogOut, PanelLeft, Languages, Check } from "lucide-react"; 
import Image from 'next/image'; // Added Image import
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";
import type { ReactNode } from 'react';
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  title: string;
  navLinksComponent?: ReactNode;
  homePath?: string;
}

export function AppHeader({ title, navLinksComponent, homePath = "/" }: AppHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { language, setLanguage, translate } = useLanguage();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: translate("logoutSuccessTitle") || "Logged Out", description: translate("logoutSuccessDesc") || "You have been successfully logged out." });
      router.push('/login');
    } catch (error: any) {
      console.error("Logout failed:", error);
       toast({ variant: "destructive", title: translate("logoutFailedTitle") || "Logout Failed", description: error.message });
    }
  };

  const languageOptions: { value: Language; labelKey: string }[] = [
    { value: 'en', labelKey: 'english' },
    { value: 'fr', labelKey: 'french' },
    { value: 'rw', labelKey: 'kinyarwanda' },
    { value: 'sw', labelKey: 'swahili' },
    { value: 'hi', labelKey: 'hindi' },
    { value: 'zh', labelKey: 'chineseSimplified' },
    { value: 'ja', labelKey: 'japanese' },
    { value: 'ko', labelKey: 'korean' },
    { value: 'ha', labelKey: 'hausa' },
    { value: 'yo', labelKey: 'yoruba' },
    { value: 'bn', labelKey: 'bengali' },
    { value: 'ta', labelKey: 'tamil' },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:py-4 justify-between">
      <div className="flex items-center gap-2">
        {navLinksComponent && (
          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">{translate('mobileMenuTitle') || 'Menu'}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 flex flex-col">
                <SheetHeader>
                  {/* Visually hidden title for accessibility */}
                  <SheetTitle className="sr-only">{translate('mobileMenuTitle') || 'Mobile Menu'}</SheetTitle>
                </SheetHeader>
                <Link href={homePath} className="flex items-center gap-2 border-b px-4 py-3.5 mb-2">
                   <Image src="/icon.png" alt={translate('appName') || 'App Logo'} width={24} height={24} className="h-6 w-6" />
                   <span className="text-lg font-semibold text-primary">{translate('appName')}</span>
                </Link>
                <div className="flex-grow overflow-y-auto">
                  {navLinksComponent}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        <Link href={homePath} className="hidden items-center gap-2 sm:flex">
           <Image src="/icon.png" alt={translate('appName') || 'App Logo'} width={24} height={24} className="h-6 w-6" />
           <h1 className="text-xl font-semibold text-primary">{translate('appName')}</h1>
        </Link>
        <span className="text-xl font-light text-muted-foreground hidden sm:inline">| {title}</span>
      </div>

      <h1 className="text-lg font-semibold sm:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{title}</h1>
      
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Languages className="h-4 w-4" />
              <span className="sr-only">{translate('selectLanguage')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{translate('selectLanguage')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {languageOptions.map((option) => (
              <DropdownMenuItem key={option.value} onClick={() => setLanguage(option.value)}>
                {language === option.value && <Check className="mr-2 h-4 w-4" />}
                {translate(option.labelKey)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

         <Button variant="outline" size="icon" onClick={handleLogout} title={translate('logout')}>
           <LogOut className="h-4 w-4" />
           <span className="sr-only">{translate('logout')}</span>
         </Button>
      </div>
    </header>
  );
}
