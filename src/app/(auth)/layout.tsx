import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  // This layout can be used for login, signup, forgot password pages
  // It ensures they don't inherit the main app sidebar/header if needed
  return (
    <div className="min-h-screen bg-secondary">
      {children}
    </div>
  );
}
