
// src/app/superadmin/users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { UserProfile, Role } from "@/lib/types"; // Role might be needed for badge color

interface SystemUserDisplay extends UserProfile {
  id: string;
}

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
};

// Optional: Helper for role badge styling
const getRoleBadgeVariant = (role: Role): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (role) {
    case 'SuperAdmin': return 'destructive';
    case 'Admin': return 'default';
    case 'Teacher': return 'secondary';
    case 'Parent': return 'outline';
    case 'Student': return 'outline'; // Could use a different color, e.g., via custom variant
    default: return 'outline';
  }
};


export default function SuperAdminManageUsersPage() {
  const { translate } = useLanguage();
  const [allUsers, setAllUsers] = useState<SystemUserDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Consider adding orderBy if needed, e.g., orderBy("createdAt", "desc")
        // Also, for very large user bases, pagination would be necessary.
        const q = query(collection(db, "users"), orderBy("createdAt", "desc")); 
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as UserProfile),
        })) as SystemUserDisplay[];
        setAllUsers(users);
      } catch (err: any) {
        console.error("Error fetching all users:", err);
        setError(translate("errorLoadingAllUsers") || "Failed to load all users.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, [translate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3 text-lg">{translate("loadingAllUsers") || "Loading all users..."}</span>
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
          <Users className="h-6 w-6" />
          {translate('superAdminManageAllUsersTitle')}
        </CardTitle>
        <CardDescription>
          {translate('superAdminManageAllUsersDescPage')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {translate('noUsersFound') || "No users found in the system."}
          </p>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">{translate('avatarUrlLabel')}</TableHead>
                  <TableHead>{translate('columnName')}</TableHead>
                  <TableHead>{translate('columnEmail')}</TableHead>
                  <TableHead>{translate('roleLabel')}</TableHead>
                  <TableHead>{translate('schoolNameLabel')}/{translate('schoolIdLabel')}</TableHead>
                  {/* Add more columns as needed, e.g., Created At, Actions */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatarUrl} alt={user.name || 'User'} />
                        <AvatarFallback>{getInitials(user.name || '?')}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{user.name || translate('notSetPlaceholder')}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role || translate('unknownRolePlaceholder')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === 'Admin' && (user.schoolName || translate('schoolNameNotSet'))}
                      {(user.role === 'Teacher' || user.role === 'Student' || user.role === 'Parent') && (user.schoolId || translate('noSchoolIdPlaceholder'))}
                      {user.role === 'SuperAdmin' && translate('globalAccessPlaceholder')}
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
