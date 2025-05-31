
// src/app/superadmin/schools/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, School, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { UserProfile } from "@/lib/types";

interface AdminUserDisplay extends UserProfile {
  id: string;
}

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
};

export default function SuperAdminManageSchoolsPage() {
  const { translate } = useLanguage();
  const [adminUsers, setAdminUsers] = useState<AdminUserDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(collection(db, "users"), where("role", "==", "Admin"));
        const querySnapshot = await getDocs(q);
        const admins = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as UserProfile),
        })) as AdminUserDisplay[];
        setAdminUsers(admins);
      } catch (err: any) {
        console.error("Error fetching admin users:", err);
        setError(translate("errorLoadingAdmins") || "Failed to load school administrators.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminUsers();
  }, [translate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3 text-lg">{translate("loadingAdmins") || "Loading school administrators..."}</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader className="flex-row items-center gap-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
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
          <School className="h-6 w-6" />
          {translate('superAdminManageSchoolsTitle')}
        </CardTitle>
        <CardDescription>
          {translate('superAdminManageSchoolsDescPage')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {adminUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {translate('noAdminsFound') || "No school administrators found in the system."}
          </p>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">{translate('avatarUrlLabel')}</TableHead>
                  <TableHead>{translate('schoolNameLabel')}</TableHead>
                  <TableHead>{translate('adminNameLabel')}</TableHead>
                  <TableHead>{translate('adminEmailLabel')}</TableHead>
                  <TableHead>{translate('schoolIdentifierCodeLabel')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={admin.avatarUrl} alt={admin.name || 'Admin'} />
                        <AvatarFallback>{getInitials(admin.name || 'A')}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{admin.schoolName || translate('notSetPlaceholder')}</TableCell>
                    <TableCell>{admin.name || translate('notSetPlaceholder')}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell className="font-mono">{admin.schoolIdentifierCode || translate('notSetPlaceholder')}</TableCell>
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
