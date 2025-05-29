"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { BellRing, Megaphone, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { ParentNotificationPreferences } from "@/lib/types";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [preferences, setPreferences] = useState<ParentNotificationPreferences>({
    absenceAlerts: false,
    lowAttendanceThreshold: false,
    newBehaviorReport: false,
  });
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    setLoadingPrefs(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.notificationPreferences) {
          setPreferences(userData.notificationPreferences);
        } else {
          // Initialize with defaults if not present
          setPreferences({ absenceAlerts: false, lowAttendanceThreshold: false, newBehaviorReport: false });
        }
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load notification settings." });
    } finally {
      setLoadingPrefs(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchPreferences();
    } else if (!authLoading && !user) {
      setLoadingPrefs(false); // No user, stop loading
    }
  }, [user, authLoading, fetchPreferences]);

  const handlePreferenceChange = async (key: keyof ParentNotificationPreferences, value: boolean) => {
    if (!user) return;

    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs); // Optimistic update

    setIsSaving(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      // Use updateDoc to merge, or setDoc with merge:true if you want to ensure the field exists
      await updateDoc(userDocRef, {
        notificationPreferences: newPrefs
      });
      toast({ title: "Settings Saved", description: "Your notification preferences have been updated." });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save your preferences." });
      // Revert optimistic update on error
      fetchPreferences(); 
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loadingPrefs) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Configure alerts for your children's attendance and behavior. These settings control
          what you see within the app. Actual email/push notifications require additional backend setup by the school.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2 flex items-center gap-2"><BellRing className="h-5 w-5 text-primary"/> Attendance Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
              <Label htmlFor="absence-alert" className="flex flex-col space-y-1">
                <span>Absence Alerts</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Receive an in-app notification when your child is marked absent.
                </span>
              </Label>
              <Switch 
                id="absence-alert" 
                aria-label="Absence Alerts Toggle"
                checked={preferences.absenceAlerts}
                onCheckedChange={(value) => handlePreferenceChange('absenceAlerts', value)}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
              <Label htmlFor="threshold-alert" className="flex flex-col space-y-1">
                <span>Low Attendance Threshold (Concept)</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Get notified if attendance drops below a certain percentage (e.g., 90%). (Feature not fully implemented)
                </span>
              </Label>
              <Switch 
                id="threshold-alert" 
                aria-label="Low Attendance Threshold Toggle" 
                checked={preferences.lowAttendanceThreshold}
                onCheckedChange={(value) => handlePreferenceChange('lowAttendanceThreshold', value)}
                disabled={isSaving}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-medium mb-2 flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary"/> Behavior Report Notifications</h3>
           <div className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
              <Label htmlFor="behavior-report-alert" className="flex flex-col space-y-1">
                <span>New Behavior Report Alerts</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Receive an in-app notification when a new behavior report is filed for your child.
                </span>
              </Label>
              <Switch 
                id="behavior-report-alert" 
                aria-label="New Behavior Report Toggle" 
                checked={preferences.newBehaviorReport}
                onCheckedChange={(value) => handlePreferenceChange('newBehaviorReport', value)}
                disabled={isSaving}
              />
            </div>
             <p className="text-sm text-muted-foreground p-4 border rounded-lg bg-secondary/50">
                New behavior reports for your children will also appear in their respective "Behavior Reports" section.
                {isSaving && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />}
             </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
