
// src/app/admin/parent-responses/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore'; // Added where
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, Info, UserCircle, CalendarDays, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BehaviorReport, ParentResponse } from '@/lib/types';
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth"; // Import useAuth

const getSeverityBadgeVariant = (severity?: BehaviorReport['severity']): 'default' | 'destructive' | 'secondary' | 'outline' => {
  if (!severity) return 'outline';
  switch (severity) {
    case 'Minor': return 'default';
    case 'Moderate': return 'secondary';
    case 'Severe': return 'destructive';
    default: return 'outline';
  }
};

const getSeverityBadgeClasses = (severity?: BehaviorReport['severity']): string => {
    if (!severity) return '';
    switch (severity) {
      case 'Minor': return 'bg-blue-500 hover:bg-blue-600 text-white'; 
      case 'Moderate': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'Severe': return ''; 
      default: return '';
    }
};

export default function ParentResponsesPage() {
  const { translate } = useLanguage();
  const { schoolId: adminSchoolId, loading: authLoading } = useAuth(); // Get adminSchoolId
  const [reports, setReports] = useState<BehaviorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReportsWithResponses = async () => {
      if (!adminSchoolId && !authLoading) {
        setError(translate('errorLoadingReports') || "Admin school context missing. Cannot load reports.");
        setLoading(false);
        return;
      }
      if (authLoading || !adminSchoolId) return;

      setLoading(true);
      setError(null);
      try {
        const reportsQuery = query(
          collection(db, 'behaviorReports'),
          where('schoolId', '==', adminSchoolId), // Filter by admin's schoolId
          orderBy('createdAt', 'desc') 
        );
        const querySnapshot = await getDocs(reportsQuery);
        const fetchedReports = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          parentResponses: doc.data().parentResponses || [] 
        } as BehaviorReport));
        
        setReports(fetchedReports);
      } catch (err: any) {
        console.error("Error fetching behavior reports:", err);
        setError(translate('errorLoadingReports') || "Failed to load reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchReportsWithResponses();
  }, [adminSchoolId, authLoading, translate]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3 text-lg">{translate('loadingParentResponses') || "Loading parent responses..."}</span>
      </div>
    );
  }
  
  if (!adminSchoolId && !authLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Parent Responses Unavailable</CardTitle></CardHeader>
        <CardContent><p>Admin school context is missing. Cannot load parent responses.</p></CardContent>
      </Card>
    );
  }


  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive">{translate('errorTitle') || "Error"}</CardTitle>
        </CardHeader>
        <CardContent><p className="text-destructive">{error}</p></CardContent>
      </Card>
    );
  }
  
  const reportsWithResponses = reports.filter(report => report.parentResponses && report.parentResponses.length > 0);


  return (
    <Card>
      <CardHeader>
        <CardTitle>{translate('parentResponsesTitle') || "Parent Responses to Behavior Reports"}</CardTitle>
        <CardDescription>{translate('parentResponsesDescription') || "Review comments and acknowledgments from parents regarding student behavior incidents in your school."}</CardDescription>
      </CardHeader>
      <CardContent>
        {reportsWithResponses.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <Info className="mx-auto h-12 w-12" />
            <p className="mt-4">{translate('noParentResponsesFound') || "No parent responses found for any behavior reports in your school yet."}</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full space-y-4">
            {reportsWithResponses.map((report) => (
              <AccordionItem key={report.id} value={report.id} className="border rounded-lg shadow-sm">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-lg">{report.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {translate('student') || "Student"}: {report.studentName} | {translate('incidentDate') || "Incident"}: {format(report.reportDate.toDate(), 'PPP')}
                    </p>
                  </div>
                  {report.severity && (
                    <Badge 
                      variant={getSeverityBadgeVariant(report.severity)} 
                      className={cn("ml-4", getSeverityBadgeClasses(report.severity))}
                    >
                      {report.severity}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-0">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-base mb-1 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />{translate('reportDetails') || "Report Details"}:</h4>
                      <p className="text-sm text-muted-foreground mb-1">
                        {translate('reportedBy') || "Reported by"}: {report.reporterName} ({report.reporterRole}) {translate('onDate') || "on"} {format(report.createdAt.toDate(), 'PPP p')}
                      </p>
                      <p className="text-sm whitespace-pre-wrap bg-secondary/50 p-3 rounded-md border">{report.description}</p>
                    </div>

                    {report.parentResponses && report.parentResponses.length > 0 && (
                      <div>
                        <h4 className="font-medium text-base mb-2 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" />{translate('parentResponsesSectionTitle') || "Parent Responses"}:</h4>
                        <div className="space-y-3">
                          {report.parentResponses.map((response, index) => (
                            <div key={index} className="p-3 rounded-md border bg-muted/30">
                              <p className="text-sm whitespace-pre-wrap">{response.comment}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {translate('parentCommentByOn', { parentName: response.parentName, date: format(response.respondedAt.toDate(), 'PPP p') })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                     {!report.parentResponses || report.parentResponses.length === 0 && (
                        <p className="text-sm text-muted-foreground">{translate('noResponsesForThisReport') || "No parent responses for this specific report yet."}</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

