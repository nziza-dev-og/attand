
import type { ReactNode } from 'react';
import { AppHeader } from '@/components/shared/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { translate } = useLanguage();
  // This layout can be used for login, signup, forgot password pages
  // It ensures they don't inherit the main app sidebar/header if needed
  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <AppHeader 
        title={translate('loginPageTitle') || "Login / Register"} 
        homePath="/login" 
      />
      <main className="flex flex-1 items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
