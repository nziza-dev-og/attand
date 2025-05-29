
// src/app/admin/locked-accounts/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldAlert, Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { UserProfile } from "@/lib/types";

interface LockedTeacherAccount extends UserProfile {
  id: string;
}

export default function LockedAccountsPage() {
  const { translate } = useLanguage();
  const [lockedAccounts, setLockedAccounts] = useState<LockedTeacherAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    fetchLockedAccounts();
  }, [translate]);

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
                  <TableHead className="text-right">{translate("columnAttemptsLeft")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lockedAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name || "N/A"}</TableCell>
                    <TableCell>{account.email}</TableCell>
                    <TableCell>{account.enteredSchoolCode || "N/A"}</TableCell>
                    <TableCell className="text-right">{account.schoolCodeVerificationAttempts ?? 0}</TableCell>
                    {/* Add an "Unblock" button here in the future if needed */}
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
