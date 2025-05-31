
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, School, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface SuperAdminStats {
  totalSchools: number; // Number of Admin accounts
  totalUsers: number;   // Total users (excluding SuperAdmin itself perhaps)
}

export default function SuperAdminDashboardPage() {
  const { translate } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (authLoading || !user) return;
      setLoadingStats(true);
      try {
        const adminUsersQuery = collection(db, "users"); // query(collection(db, "users"), where("role", "==", "Admin"));
        const allUsersQuery = collection(db, "users");

        const adminSnapshot = await getCountFromServer(adminUsersQuery); // Replace with actual query later
        const allUsersSnapshot = await getCountFromServer(allUsersQuery);
        
        // This is a simplification. "Total Schools" might be better represented by unique schoolIds or Admin count.
        // For now, let's assume "Total Schools" is the count of Admin users.
        const adminCountQuery = query(collection(db, "users"), where("role", "==", "Admin"));
        const adminCountSnapshot = await getCountFromServer(adminCountQuery);


        setStats({
          totalSchools: adminCountSnapshot.data().count,
          totalUsers: allUsersSnapshot.data().count,
        });
      } catch (error) {
        console.error("Error fetching super admin stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [user, authLoading]);

  if (authLoading || loadingStats) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid auto-rows-min gap-6">
      <Card className="sm:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle>{translate('superAdminDashboardTitle')}</CardTitle>
          <CardDescription className="max-w-lg text-balance leading-relaxed">
            {translate('superAdminDashboardDesc') || "Oversee all schools, manage users, and maintain system integrity."}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translate('totalSchoolsManaged') || "Total Schools Managed"}</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSchools ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {translate('totalAdminAccounts') || "Represents number of Admin accounts"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translate('totalUsersSystem') || "Total Users in System"}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {translate('allUserRolesCombined') || "Includes Admins, Teachers, Parents, Students"}
            </p>
          </CardContent>
        </Card>
      </div>
       <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"> <ShieldCheck className="h-6 w-6 text-primary"/> {translate('superAdminResponsibilitiesTitle') || "Super Admin Responsibilities"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>{translate('superAdminManageSchoolsDesc') || "Manage and monitor all registered school administrators and their respective schools."}</p>
            <p>{translate('superAdminManageUsersDesc') || "Oversee all user accounts across the platform, with capabilities for moderation if necessary."}</p>
            <p>{translate('superAdminSystemIntegrityDesc') || "Ensure the overall health and integrity of the AttendEase platform."}</p>
          </CardContent>
        </Card>
    </div>
  );
}
