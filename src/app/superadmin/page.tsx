
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, School, ShieldCheck, PieChart as PieChartIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, type ChartConfig } from "@/components/ui/chart";
import type { Role } from "@/lib/types";

interface SuperAdminStats {
  totalSchools: number; // Number of Admin accounts
  totalUsers: number;   // Total users
}

interface UserRoleDistributionData {
  name: string;
  value: number;
  fill: string;
}

export default function SuperAdminDashboardPage() {
  const { translate } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [userRoleDistribution, setUserRoleDistribution] = useState<UserRoleDistributionData[]>([]);
  const [loadingUserRoleDistribution, setLoadingUserRoleDistribution] = useState(true);

  const chartConfig = {
    admins: { label: translate('roleAdmin'), color: "hsl(var(--chart-1))" },
    teachers: { label: translate('roleTeacher'), color: "hsl(var(--chart-2))" },
    parents: { label: translate('roleParent'), color: "hsl(var(--chart-3))" },
    students: { label: translate('roleStudent'), color: "hsl(var(--chart-4))" },
    superadmins: { label: translate('roleSuperAdmin'), color: "hsl(var(--chart-5))" },
  } satisfies ChartConfig;


  useEffect(() => {
    const fetchAllData = async () => {
      if (authLoading || !user) return;
      
      setLoadingStats(true);
      setLoadingUserRoleDistribution(true);

      try {
        // Fetch general stats
        const adminUsersQuery = query(collection(db, "users"), where("role", "==", "Admin"));
        const allUsersCollectionQuery = collection(db, "users");

        const adminSnapshot = await getCountFromServer(adminUsersQuery);
        const allUsersSnapshot = await getCountFromServer(allUsersCollectionQuery);
        
        setStats({
          totalSchools: adminSnapshot.data().count,
          totalUsers: allUsersSnapshot.data().count,
        });
        setLoadingStats(false);

        // Fetch user role distribution data
        const usersDocsSnapshot = await getDocs(allUsersCollectionQuery);
        const roleCounts: Record<string, number> = { 
            Admin: 0, Teacher: 0, Parent: 0, Student: 0, SuperAdmin: 0 
        };
        
        usersDocsSnapshot.forEach(doc => {
          const userRole = doc.data().role as Role;
          if (userRole && roleCounts.hasOwnProperty(userRole)) {
            roleCounts[userRole]++;
          }
        });

        const distributionData = Object.entries(roleCounts).map(([roleName, count]) => {
          let translatedRoleName = roleName;
          let colorKey = roleName.toLowerCase() as keyof typeof chartConfig;

          switch(roleName as Role) {
            case 'Admin': translatedRoleName = translate('roleAdmin'); colorKey = 'admins'; break;
            case 'Teacher': translatedRoleName = translate('roleTeacher'); colorKey = 'teachers'; break;
            case 'Parent': translatedRoleName = translate('roleParent'); colorKey = 'parents'; break;
            case 'Student': translatedRoleName = translate('roleStudent'); colorKey = 'students'; break;
            case 'SuperAdmin': translatedRoleName = translate('roleSuperAdmin'); colorKey = 'superadmins'; break;
          }
          
          return {
            name: translatedRoleName || roleName,
            value: count,
            fill: chartConfig[colorKey]?.color || "hsl(var(--muted))",
          };
        }).filter(item => item.value > 0); // Only include roles with users
        
        setUserRoleDistribution(distributionData);

      } catch (error) {
        console.error("Error fetching super admin data:", error);
        setLoadingStats(false); // Ensure loading stops on error
      } finally {
        setLoadingUserRoleDistribution(false);
      }
    };

    if (!authLoading && user) {
        fetchAllData();
    } else if (!authLoading && !user) {
        setLoadingStats(false);
        setLoadingUserRoleDistribution(false);
    }
  }, [user, authLoading, translate]); // Added translate to dependencies

  const isLoading = authLoading || loadingStats || loadingUserRoleDistribution;

  if (isLoading) {
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
              <Skeleton className="h-4 w-3/4 mt-1 rounded-md" />
          </CardHeader>
          <CardContent className="flex justify-center items-center h-[300px]">
              <Skeleton className="h-full w-full max-w-xs rounded-full" />
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

      {userRoleDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              {translate('userRoleDistributionTitle') || "User Role Distribution"}
            </CardTitle>
            <CardDescription>
              {translate('userRoleDistributionDesc') || "Breakdown of users by their assigned roles."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={userRoleDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60} // For Donut chart
                    labelLine={false}
                    // label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {userRoleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend content={<ChartLegend className="mt-4" />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

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
