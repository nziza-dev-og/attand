import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BellRing, Megaphone } from "lucide-react";

export default function NotificationsPage() {
  // State for notification preferences would go here (using useState)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Configure alerts for your children's attendance and behavior.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2 flex items-center gap-2"><BellRing className="h-5 w-5 text-primary"/> Attendance Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
              <Label htmlFor="absence-alert" className="flex flex-col space-y-1">
                <span>Absence Alerts</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Receive a notification when your child is marked absent.
                </span>
              </Label>
              <Switch id="absence-alert" aria-label="Absence Alerts Toggle" />
            </div>

            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
              <Label htmlFor="threshold-alert" className="flex flex-col space-y-1">
                <span>Low Attendance Threshold</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Get notified if attendance drops below a certain percentage (e.g., 90%).
                </span>
              </Label>
              <Switch id="threshold-alert" aria-label="Low Attendance Threshold Toggle" />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-medium mb-2 flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary"/> Behavior Report Notifications</h3>
           <div className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
              <Label htmlFor="behavior-report-alert" className="flex flex-col space-y-1">
                <span>New Behavior Report</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Receive a notification when a new behavior report is filed for your child.
                </span>
              </Label>
              <Switch id="behavior-report-alert" aria-label="New Behavior Report Toggle" />
            </div>
             <p className="text-sm text-muted-foreground p-4 border rounded-lg bg-secondary/50">
                New behavior reports for your children will also appear in their respective "Behavior Reports" section.
                Actual notification delivery (e.g., email, push) requires backend setup.
             </p>
          </div>
        </div>
         
      </CardContent>
    </Card>
  );
}
