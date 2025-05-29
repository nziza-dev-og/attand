
// src/app/parent/select-child/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, User, Users, AlertCircle, Info, CalendarCheck, FileText } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { Student, Parent } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface DisplayChild extends Pick<Student, 'id' | 'name' | 'avatarUrl'> {}

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('') || '??';
};

export default function SelectChildPage() {
  const { user, loading: authLoading } = useAuth();
  const { translate } = useLanguage();
  const [childrenList, setChildrenList] = useState<DisplayChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChildrenDetails = async () => {
      if (authLoading || !user) {
        if (!authLoading && !user) {
            setError(translate('mustBeLoggedInError') || "You must be logged in to view this page.");
            setLoadingChildren(false);
        }
        return;
      }

      setLoadingChildren(true);
      setError(null);
      try {
        const parentDocRef = doc(db, 'users', user.uid);
        const parentDocSnap = await getDoc(parentDocRef);

        if (!parentDocSnap.exists() || parentDocSnap.data().role !== 'Parent') {
          setError(translate('parentProfileError') || "Parent profile not found or user is not a parent.");
          setLoadingChildren(false);
          return;
        }

        const parentData = parentDocSnap.data() as Parent;
        const childIds = parentData.childIds || [];

        if (childIds.length === 0) {
          setChildrenList([]);
          setLoadingChildren(false);
          return;
        }
        
        const childrenDetailsPromises = childIds.map(async (childId) => {
          const studentDocRef = doc(db, 'users', childId);
          const studentDocSnap = await getDoc(studentDocRef);
          if (studentDocSnap.exists() && studentDocSnap.data().role === 'Student') {
            const data = studentDocSnap.data();
            return {
              id: studentDocSnap.id,
              name: data.name || translate('unknownChild') || 'Unknown Child',
              avatarUrl: data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'U')}&background=random`,
            } as DisplayChild;
          }
          return null;
        });

        const resolvedChildren = (await Promise.all(childrenDetailsPromises)).filter(Boolean) as DisplayChild[];
        setChildrenList(resolvedChildren);

      } catch (err: any) {
        console.error("Error fetching children details:", err);
        setError(translate('errorLoadingChildren') || `Failed to load children details: ${err.message}`);
      } finally {
        setLoadingChildren(false);
      }
    };

    fetchChildrenDetails();
  }, [user, authLoading, translate]);

  if (authLoading || loadingChildren) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-2">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p>{translate('loadingChildrenDetails') || "Loading children details..."}</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader className="flex-row items-center gap-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <CardTitle className="text-destructive">{translate('errorTitle')}</CardTitle>
        </CardHeader>
        <CardContent><p className="text-destructive">{error}</p></CardContent>
      </Card>
    );
  }

  if (childrenList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{translate('selectChildPageTitle')}</CardTitle>
          <CardDescription>{translate('selectChildPageDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-10 flex flex-col items-center gap-2">
            <Info className="h-10 w-10" />
            <p>{translate('noChildrenToSelect')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-7 w-7 text-primary" /> 
            {translate('selectChildPageTitle')}
          </CardTitle>
          <CardDescription>{translate('selectChildPageDesc')}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {childrenList.map((child) => (
          <Card key={child.id} className="flex flex-col overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-col items-center gap-4 p-6 bg-secondary/30">
              <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                <AvatarImage src={child.avatarUrl} alt={child.name} data-ai-hint="child student portrait" />
                <AvatarFallback className="text-3xl bg-muted text-muted-foreground">{getInitials(child.name)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl font-semibold text-center">{child.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow p-6">
              {/* Placeholder for potential future content, e.g., class or grade */}
              <p className="text-sm text-muted-foreground text-center">
                {/* Example: Child's Grade/Class could go here if available */}
              </p>
            </CardContent>
            <CardFooter className="flex flex-col md:flex-row gap-3 p-4 bg-muted/20 border-t">
              <Button asChild variant="secondary" className="w-full md:flex-1 text-sm">
                <Link href={`/parent/child/${child.id}`} className="flex items-center justify-center gap-2">
                  <CalendarCheck className="h-4 w-4" />
                  {translate('viewChildAttendanceLink')}
                </Link>
              </Button>
              <Button asChild variant="default" className="w-full md:flex-1 text-sm">
                <Link href={`/parent/child/${child.id}/behavior-reports`} className="flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4" />
                  {translate('viewChildBehaviorReportsLink')}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
