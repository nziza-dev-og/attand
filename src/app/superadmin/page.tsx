
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, School, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface SuperAdminStats {
  totalSchools: number; // Number of Admin accounts
  totalUsers: number;   // Total users
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
        const adminUsersQuery = query(collection(db, "users"), where("role", "==", "Admin"));
        const allUsersQuery = collection(db, "users");

        const adminSnapshot = await getCountFromServer(adminUsersQuery);
        const allUsersSnapshot = await getCountFromServer(allUsersQuery);
        
        setStats({
          totalSchools: adminSnapshot.data().count,
          totalUsers: allUsersSnapshot.data().count,
        });
      } catch (error) {
        console.error("Error fetching super admin stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };
    if (!authLoading && user) {
        fetchStats();
    } else if (!authLoading && !user) {
        setLoadingStats(false);
    }
  }, [user, authLoading]);

  if (authLoading || loadingStats) {
    return (
      <div className="grid auto-rows-min gap-6">
        <Card className="sm:col-span-2">
            <CardHeader className="pb-3">
                <Skeleton className="h-8 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-full mt-2 rounded-md" />
                <Skeleton className="h-4 w-5/6 mt-1 rounded-md" />
            </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-1/3 rounded-md" />
            <Skeleton className="h-4 w-2/3 mt-1 rounded-md" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-5 w-1/2 rounded-md" />
                    <School className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-1/4 rounded-md" />
                    <Skeleton className="h-4 w-3/4 mt-2 rounded-md" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-5 w-1/2 rounded-md" />
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-1/4 rounded-md" />
                    <Skeleton className="h-4 w-3/4 mt-2 rounded-md" />
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <Skeleton className="h-7 w-1/2 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid auto-rows-auto gap-6">
      <Card className="sm:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle>{translate('superAdminDashboardTitle')}</CardTitle>
          <CardDescription className="max-w-lg text-balance leading-relaxed">
            {translate('superAdminDashboardDesc') || "Oversee all schools, manage users, and maintain system integrity."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{translate('platformStatisticsTitle') || "Platform Statistics"}</CardTitle>
          <CardDescription>
            {translate('platformStatisticsDesc') || "An overview of key metrics for the AttendEase platform."}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

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
