// src/app/parent/child/[childId]/behavior-reports/page.tsx
"use client";

import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, type FormEvent } from 'react';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, Timestamp as FirestoreTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import type { Student, BehaviorReport, BehaviorReportSeverity, ParentResponse } from '@/lib/types';
import { Loader2, Megaphone, AlertCircle, Info, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('') || '??';
};

const getSeverityBadgeVariant = (severity?: BehaviorReportSeverity): 'default' | 'destructive' | 'secondary' | 'outline' => {
  if (!severity) return 'outline';
  switch (severity) {
    case 'Minor': return 'default'; 
    case 'Moderate': return 'secondary';
    case 'Severe': return 'destructive';
    default: return 'outline';
  }
};

const getSeverityBadgeClasses = (severity?: BehaviorReportSeverity): string => {
    if (!severity) return '';
    switch (severity) {
      case 'Minor': return 'bg-blue-500 hover:bg-blue-600 text-white'; 
      case 'Moderate': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'Severe': return ''; 
      default: return '';
    }
  };

export default function ChildBehaviorReportsPage() {
  const params = useParams();
  const childId = params.childId as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [childInfo, setChildInfo] = useState<Student | null>(null);
  const [behaviorReports, setBehaviorReports] = useState<BehaviorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentResponse, setCurrentResponse] = useState<Record<string, string>>({}); // { reportId: comment }
  const [submittingResponse, setSubmittingResponse] = useState<Record<string, boolean>>({}); // { reportId: isLoading }

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
          orderBy('reportDate', 'desc') 
        );
        const reportsSnap = await getDocs(reportsQuery);
        const reportsData = reportsSnap.docs.map(d => ({ id: d.id, ...d.data(), parentResponses: d.data().parentResponses || [] } as BehaviorReport));
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

  const handleResponseChange = (reportId: string, comment: string) => {
    setCurrentResponse(prev => ({ ...prev, [reportId]: comment }));
  };

  const handleAddResponse = async (reportId: string) => {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to respond." });
      return;
    }

    const parentNameForResponse = user.displayName || user.email;
    if (!parentNameForResponse) {
        toast({ variant: "destructive", title: "Profile Incomplete", description: "Could not identify your account. Please ensure your profile is complete or contact support." });
        return;
    }

    const comment = currentResponse[reportId]?.trim();
    if (!comment) {
      toast({ variant: "destructive", title: "Empty Response", description: "Response cannot be empty." });
      return;
    }

    setSubmittingResponse(prev => ({ ...prev, [reportId]: true }));
    try {
      const newResponse: ParentResponse = {
        parentId: user.uid,
        parentName: parentNameForResponse,
        comment: comment,
        respondedAt: FirestoreTimestamp.now(),
      };

      const reportRef = doc(db, "behaviorReports", reportId);
      await updateDoc(reportRef, {
        parentResponses: arrayUnion(newResponse)
      });

      // Update local state
      setBehaviorReports(prevReports =>
        prevReports.map(report =>
          report.id === reportId
            ? { ...report, parentResponses: [...(report.parentResponses || []), newResponse] }
            : report
        )
      );
      setCurrentResponse(prev => ({ ...prev, [reportId]: "" })); // Clear textarea
      toast({ title: "Response Added", description: "Your response has been submitted." });
    } catch (err) {
      console.error("Error adding response:", err);
      toast({ variant: "destructive", title: "Submission Failed", description: "Failed to submit your response. Please try again." });
    } finally {
      setSubmittingResponse(prev => ({ ...prev, [reportId]: false }));
    }
  };


  if (authLoading || loading) {
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
            
            {/* Parent Responses Section */}
            {(report.parentResponses && report.parentResponses.length > 0) && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-md font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" /> Parent Responses
                </h4>
                <div className="space-y-3">
                  {report.parentResponses.map((response, index) => (
                    <div key={index} className="p-3 rounded-md bg-secondary/50 border">
                      <p className="text-sm whitespace-pre-wrap">{response.comment}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        By: {response.parentName} on {format(response.respondedAt.toDate(), 'PPP p')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Response Form */}
            <div className="mt-4 pt-4 border-t">
              <Label htmlFor={`response-${report.id}`} className="text-md font-semibold mb-2 block">Add Your Response</Label>
              <Textarea
                id={`response-${report.id}`}
                value={currentResponse[report.id] || ""}
                onChange={(e) => handleResponseChange(report.id, e.target.value)}
                placeholder="Type your comment or acknowledgment here..."
                rows={3}
                disabled={submittingResponse[report.id]}
              />
              <Button 
                onClick={() => handleAddResponse(report.id)} 
                disabled={submittingResponse[report.id] || !currentResponse[report.id]?.trim()}
                className="mt-2"
                size="sm"
              >
                {submittingResponse[report.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Response
              </Button>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Report logged on: {format(report.createdAt.toDate(), 'PPP p')}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
