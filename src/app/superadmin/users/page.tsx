
// src/app/superadmin/users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, type Timestamp } from "firebase/firestore"; // Added type Timestamp
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { UserProfile, Role } from "@/lib/types"; 

interface SystemUserDisplay extends UserProfile {
  id: string;
}

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
};

const getRoleBadgeVariant = (role?: Role): 'default' | 'secondary' | 'outline' | 'destructive' => {
  if (!role) return 'outline';
  switch (role) {
    case 'SuperAdmin': return 'destructive';
    case 'Admin': return 'default'; 
    case 'Teacher': return 'secondary';
    case 'Parent': return 'outline'; 
    // Student case removed from variants as they won't be displayed, but kept for type safety if needed elsewhere.
    // case 'Student': return 'outline'; 
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
        const q = query(collection(db, "users"), orderBy("createdAt", "desc")); 
        const querySnapshot = await getDocs(q);
        const usersData = querySnapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as UserProfile),
        })) as SystemUserDisplay[];
        
        // Filter out users with the role 'Student'
        const filteredUsers = usersData.filter(user => user.role !== 'Student');
        
        setAllUsers(filteredUsers);
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
                        {user.role ? translate(`role${user.role}`) || user.role : translate('unknownRolePlaceholder')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === 'Admin' && (user.schoolName || translate('schoolNameNotSet'))}
                      {(user.role === 'Teacher' || (user.role === 'Parent' && user.schoolId)) && (user.schoolId || translate('noSchoolIdPlaceholder'))}
                      {user.role === 'SuperAdmin' && translate('globalAccessPlaceholder')}
                      {(user.role === 'Parent' && !user.schoolId) && translate('parentNotLinkedToSchool')}
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
