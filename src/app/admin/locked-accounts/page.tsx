
// src/app/admin/locked-accounts/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, Info, KeyRound, Unlock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/types";

const MAX_VERIFICATION_ATTEMPTS = 3; // Should be consistent with login/verify-school pages

interface LockedTeacherAccount extends UserProfile {
  id: string;
}

export default function LockedAccountsPage() {
  const { translate } = useLanguage();
  const { toast } = useToast();
  const [lockedAccounts, setLockedAccounts] = useState<LockedTeacherAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblockingStates, setUnblockingStates] = useState<Record<string, boolean>>({});

  const fetchLockedAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "Teacher"),
        where("isSchoolCodeLocked", "==", true)
      );
      const querySnapshot = await getDocs(q);
      const accounts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as UserProfile),
      })) as LockedTeacherAccount[];
      setLockedAccounts(accounts);
    } catch (err: any) {
      console.error("Error fetching locked accounts:", err);
      setError(translate("errorLoadingLockedAccounts") || "Failed to load locked accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLockedAccounts();
  }, [translate]);

  const handleUnblockAccount = async (teacherId: string) => {
    setUnblockingStates(prev => ({ ...prev, [teacherId]: true }));
    try {
      const teacherDocRef = doc(db, "users", teacherId);
      await updateDoc(teacherDocRef, {
        isSchoolCodeLocked: false,
        schoolCodeVerificationAttempts: MAX_VERIFICATION_ATTEMPTS,
      });
      toast({
        title: translate("accountUnblockedTitle") || "Account Unblocked",
        description: translate("accountUnblockedDesc", { teacherId }),
      });
      // Refresh the list or filter out the unblocked account
      setLockedAccounts(prev => prev.filter(acc => acc.id !== teacherId));
    } catch (err: any) {
      console.error("Error unblocking account:", err);
      toast({
        variant: "destructive",
        title: translate("errorTitle") || "Error",
        description: translate("errorUnblockingAccount") || "Failed to unblock account.",
      });
    } finally {
      setUnblockingStates(prev => ({ ...prev, [teacherId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3 text-lg">{translate("loadingLockedAccounts") || "Loading locked accounts..."}</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive">{translate("errorTitle")}</CardTitle>
        </CardHeader>
        <CardContent><p className="text-destructive">{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" /> 
          {translate("lockedAccountsTitle")}
        </CardTitle>
        <CardDescription>{translate("lockedAccountsDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {lockedAccounts.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 flex flex-col items-center gap-2">
            <Info className="h-10 w-10" />
            <p>{translate("noLockedAccountsFound")}</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate("columnName")}</TableHead>
                  <TableHead>{translate("columnEmail")}</TableHead>
                  <TableHead>{translate("columnEnteredCode")}</TableHead>
                  <TableHead className="text-center">{translate("columnAttemptsLeft")}</TableHead>
                  <TableHead className="text-right">{translate("columnActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lockedAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name || "N/A"}</TableCell>
                    <TableCell>{account.email}</TableCell>
                    <TableCell>{account.enteredSchoolCode || "N/A"}</TableCell>
                    <TableCell className="text-center">{account.schoolCodeVerificationAttempts ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblockAccount(account.id)}
                        disabled={unblockingStates[account.id]}
                      >
                        {unblockingStates[account.id] ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Unlock className="mr-2 h-4 w-4" />
                        )}
                        {translate("unblockAccountButton")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
