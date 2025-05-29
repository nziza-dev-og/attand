// src/app/parent/child/[childId]/behavior-reports/page.tsx
"use client";

import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import type { Student, BehaviorReport, BehaviorReportSeverity } from '@/lib/types';
import { Loader2, Megaphone, AlertCircle, Info } from 'lucide-react';

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('') || '??';
};

const getSeverityBadgeVariant = (severity?: BehaviorReportSeverity): 'default' | 'destructive' | 'secondary' | 'outline' => {
  if (!severity) return 'outline';
  switch (severity) {
    case 'Minor': return 'default'; // Consider a less alarming color, e.g., blue or green based on theme. Using default (primary) for now.
    case 'Moderate': return 'secondary'; // Yellow
    case 'Severe': return 'destructive'; // Red
    default: return 'outline';
  }
};

const getSeverityBadgeClasses = (severity?: BehaviorReportSeverity): string => {
    if (!severity) return '';
    switch (severity) {
      case 'Minor': return 'bg-blue-500 hover:bg-blue-600 text-white'; 
      case 'Moderate': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'Severe': return ''; // Destructive variant handles its own styling
      default: return '';
    }
  };

export default function ChildBehaviorReportsPage() {
  const params = useParams();
  const childId = params.childId as string;

  const [childInfo, setChildInfo] = useState<Student | null>(null);
  const [behaviorReports, setBehaviorReports] = useState<BehaviorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!childId) {
        setError("Child ID is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fetch Child Info
        const studentDocRef = doc(db, 'users', childId);
        const studentDocSnap = await getDoc(studentDocRef);

        if (studentDocSnap.exists() && studentDocSnap.data().role === 'Student') {
          const data = studentDocSnap.data();
          setChildInfo({
            id: studentDocSnap.id,
            name: data.name || 'Unknown Child',
            avatarUrl: data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'U')}&background=random`,
            // Add other student fields if needed
          } as Student);
        } else {
          setError(studentDocSnap.exists() ? "User is not a Student." : "Student profile not found.");
          setLoading(false);
          return;
        }

        // Fetch Behavior Reports
        const reportsQuery = query(
          collection(db, 'behaviorReports'),
          where('studentId', '==', childId),
          orderBy('reportDate', 'desc') // Show newest incidents first
        );
        const reportsSnap = await getDocs(reportsQuery);
        const reportsData = reportsSnap.docs.map(d => ({ id: d.id, ...d.data() } as BehaviorReport));
        setBehaviorReports(reportsData);

      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(`Failed to load data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [childId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3 text-lg">Loading behavior reports...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader className="flex-row items-center gap-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <CardTitle className="text-destructive">Error Loading Reports</CardTitle>
        </CardHeader>
        <CardContent><p className="text-destructive">{error}</p></CardContent>
      </Card>
    );
  }

  if (!childInfo) {
    return <p>Child information could not be loaded.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Avatar className="h-16 w-16">
            <AvatarImage src={childInfo.avatarUrl} alt={childInfo.name} data-ai-hint="child student portrait" />
            <AvatarFallback>{getInitials(childInfo.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{childInfo.name}</CardTitle>
            <CardDescription>Behavior Reports</CardDescription>
          </div>
        </CardHeader>
      </Card>

      {behaviorReports.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Info className="h-8 w-8" />
            <p>No behavior reports found for {childInfo.name}.</p>
          </CardContent>
        </Card>
      )}

      {behaviorReports.map(report => (
        <Card key={report.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{report.title}</CardTitle>
                <CardDescription>
                  Incident Date: {format(report.reportDate.toDate(), 'PPP')} | Reported by: {report.reporterName} ({report.reporterRole})
                </CardDescription>
              </div>
              {report.severity && (
                <Badge 
                  variant={getSeverityBadgeVariant(report.severity)}
                  className={getSeverityBadgeClasses(report.severity)}
                >
                  {report.severity}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{report.description}</p>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Report logged on: {format(report.createdAt.toDate(), 'PPP p')}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
