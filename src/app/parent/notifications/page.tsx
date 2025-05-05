import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function NotificationsPage() {
  // State for notification preferences would go here (using useState)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Configure alerts for your children's attendance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
           <Label htmlFor="absence-alert" className="flex flex-col space-y-1">
             <span>Absence Alerts</span>
             <span className="font-normal leading-snug text-muted-foreground">
               Receive a notification when your child is marked absent.
             </span>
           </Label>
           <Switch id="absence-alert" /> {/* Add state and handler */}
         </div>

         <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
           <Label htmlFor="threshold-alert" className="flex flex-col space-y-1">
             <span>Low Attendance Threshold</span>
             <span className="font-normal leading-snug text-muted-foreground">
               Get notified if attendance drops below a certain percentage (e.g., 90%).
             </span>
           </Label>
           <Switch id="threshold-alert" /> {/* Add state and handler */}
           {/* Consider adding an input for the threshold percentage */}
         </div>

         <p className="text-muted-foreground">Notification functionality (e.g., email, push) needs to be implemented on the backend.</p>
      </CardContent>
    </Card>
  );
}
