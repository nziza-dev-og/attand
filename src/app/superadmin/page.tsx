
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, School, ShieldCheck, Edit3, Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where, doc, getDoc, setDoc } from "firebase/firestore"; 
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";


interface SuperAdminStats {
  totalSchools: number; // Number of Admin accounts
  totalUsers: number;   // Total users
}

export default function SuperAdminDashboardPage() {
  const { translate } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [adminRegCode, setAdminRegCode] = useState<string>("");
  const [loadingAdminRegCode, setLoadingAdminRegCode] = useState(true);
  const [isSavingAdminRegCode, setIsSavingAdminRegCode] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      if (authLoading || !user) return;
      
      setLoadingStats(true);
      setLoadingAdminRegCode(true);
      setFetchError(null);

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
      } catch (error) {
        console.error("Error fetching super admin stats:", error);
        setFetchError(translate("errorLoadingStats") || "Failed to load platform statistics.");
      } finally {
        setLoadingStats(false);
      }

      // Fetch Admin Registration Code
      try {
        const regCodesDocRef = doc(db, "platformSettings", "registrationCodes");
        const docSnap = await getDoc(regCodesDocRef);
        if (docSnap.exists()) {
          setAdminRegCode(docSnap.data().adminSecretCode || "");
        } else {
          setAdminRegCode(""); // Not set yet
        }
      } catch (error) {
        console.error("Error fetching admin registration code:", error);
        toast({ variant: "destructive", title: translate("errorTitle"), description: translate("errorLoadingAdminRegCode") });
      } finally {
        setLoadingAdminRegCode(false);
      }
    };

    if (!authLoading && user) {
        fetchAllData();
    } else if (!authLoading && !user) {
        setLoadingStats(false);
        setLoadingAdminRegCode(false);
        setFetchError(translate("errorAuthRequired") || "Authentication required to view this data.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, translate, toast]);

  const handleSaveAdminRegCode = async () => {
    if (!adminRegCode.trim()) {
      toast({ variant: "destructive", title: translate("errorTitle"), description: translate("adminRegCodeCannotBeEmpty") });
      return;
    }
    setIsSavingAdminRegCode(true);
    try {
      const regCodesDocRef = doc(db, "platformSettings", "registrationCodes");
      await setDoc(regCodesDocRef, { adminSecretCode: adminRegCode.trim() }, { merge: true });
      toast({ title: translate("adminRegCodeSavedTitle"), description: translate("adminRegCodeSavedDesc") });
    } catch (error) {
      console.error("Error saving admin registration code:", error);
      toast({ variant: "destructive", title: translate("errorTitle"), description: translate("errorSavingAdminRegCode") });
    } finally {
      setIsSavingAdminRegCode(false);
    }
  };


  const isLoading = authLoading || loadingStats || loadingAdminRegCode; 

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

  if (fetchError) {
    return (
        <Card className="border-destructive bg-destructive/10">
            <CardHeader>
                <CardTitle className="text-destructive">{translate("errorTitle")}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-destructive">{fetchError}</p></CardContent>
        </Card>
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
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary" />
            {translate('manageAdminRegCodeTitle') || "Manage Admin Registration Code"}
          </CardTitle>
          <CardDescription>
            {translate('manageAdminRegCodeDesc') || "Set or update the secret code required for new Admin registrations."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="adminRegCodeInput">{translate('adminRegCodeLabel') || "Admin Registration Code"}</Label>
            <Input
              id="adminRegCodeInput"
              type="text"
              value={adminRegCode}
              onChange={(e) => setAdminRegCode(e.target.value)}
              placeholder={translate('enterAdminRegCodePlaceholder') || "Enter new code"}
              disabled={isSavingAdminRegCode}
              className="mt-1"
            />
          </div>
          <Button onClick={handleSaveAdminRegCode} disabled={isSavingAdminRegCode || !adminRegCode.trim()}>
            {isSavingAdminRegCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {translate('saveAdminRegCodeButton') || "Save Code"}
          </Button>
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

