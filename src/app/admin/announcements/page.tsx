
// src/app/admin/announcements/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, type FormEvent } from "react";
import { collection, addDoc, getDocs, query, orderBy, Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, Speaker, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from 'date-fns';
import type { Announcement } from "@/lib/types";

export default function ManageAnnouncementsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const { translate } = useLanguage();
  const { toast } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
  const [newAnnouncementContent, setNewAnnouncementContent] = useState("");
  const [newAnnouncementIsActive, setNewAnnouncementIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAnnouncements = React.useCallback(async () => {
    if (authLoading || !user) return;
    setLoadingAnnouncements(true);
    try {
      // Admins and SuperAdmins fetch all announcements
      const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(docSnap => ({ // Renamed doc to docSnap
        id: docSnap.id,
        ...docSnap.data()
      } as Announcement));
      setAnnouncements(data);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast({ variant: "destructive", title: translate("errorTitle"), description: translate("errorLoadingAnnouncements") });
    } finally {
      setLoadingAnnouncements(false);
    }
  }, [authLoading, user, toast, translate]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !role) {
      toast({ variant: "destructive", title: translate("errorTitle"), description: "User not authenticated or role missing." });
      return;
    }
    if (!newAnnouncementTitle.trim() || !newAnnouncementContent.trim()) {
      toast({ variant: "destructive", title: translate("validationErrorTitle"), description: translate("announcementTitleContentRequired") });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "announcements"), {
        title: newAnnouncementTitle.trim(),
        content: newAnnouncementContent.trim(),
        creatorId: user.uid,
        creatorName: user.displayName || user.email || "Unknown Creator",
        creatorRole: role,
        isActive: newAnnouncementIsActive,
        createdAt: Timestamp.now(),
      });
      toast({ title: translate("announcementAddedSuccessTitle"), description: translate("announcementAddedSuccessDesc") });
      resetAddForm();
      setIsAddDialogOpen(false);
      fetchAnnouncements();
    } catch (error) {
      console.error("Error adding announcement:", error);
      toast({ variant: "destructive", title: translate("errorTitle"), description: translate("errorAddingAnnouncement") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setNewAnnouncementTitle("");
    setNewAnnouncementContent("");
    setNewAnnouncementIsActive(true);
  };

  const toggleAnnouncementStatus = async (item: Announcement) => {
    try {
      const itemRef = doc(db, "announcements", item.id);
      await updateDoc(itemRef, { isActive: !item.isActive });
      toast({ title: translate("announcementStatusUpdatedTitle"), description: translate("announcementStatusUpdatedDesc") });
      fetchAnnouncements();
    } catch (error) {
      console.error("Error toggling announcement status:", error);
      toast({ variant: "destructive", title: translate("errorTitle"), description: translate("errorUpdatingAnnouncementStatus") });
    }
  };

  const handleDelete = async () => {
    if (!announcementToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "announcements", announcementToDelete.id));
      toast({ title: translate("announcementDeletedSuccessTitle"), description: translate("announcementDeletedSuccessDesc", { title: announcementToDelete.title }) });
      fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast({ variant: "destructive", title: translate("errorTitle"), description: translate("errorDeletingAnnouncement") });
    } finally {
      setIsDeleting(false);
      setAnnouncementToDelete(null);
    }
  };

  if (authLoading || loadingAnnouncements) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{translate("loadingAnnouncements")}</span>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Speaker className="h-6 w-6" />{translate("manageAnnouncements")}</CardTitle>
            <CardDescription>{translate("manageAnnouncementsDesc")}</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetAddForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-4 w-4" />
                {translate("addAnnouncementButton")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{translate("addAnnouncement")}</DialogTitle>
                <DialogDescription>{translate("addAnnouncementDescription")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="grid gap-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="title">{translate("title")}</Label>
                  <Input
                    id="title"
                    value={newAnnouncementTitle}
                    onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="content">{translate("content")}</Label>
                  <Textarea
                    id="content"
                    rows={4}
                    value={newAnnouncementContent}
                    onChange={(e) => setNewAnnouncementContent(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={newAnnouncementIsActive}
                    onCheckedChange={setNewAnnouncementIsActive}
                  />
                   <Label htmlFor="active">{translate("active")}</Label>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">{translate("cancel")}</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {translate("save")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">{translate("noAnnouncements")}</p>
          ) : (
            <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate("title")}</TableHead>
                  <TableHead>{translate("status")}</TableHead>
                  <TableHead>{translate("createdAt")}</TableHead>
                  <TableHead className="text-right">{translate("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map(announcement => (
                  <TableRow key={announcement.id}>
                    <TableCell className="font-medium">{announcement.title}</TableCell>
                    <TableCell>
                       <Button variant="ghost" size="sm" onClick={() => toggleAnnouncementStatus(announcement)} className="gap-1">
                           {announcement.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                           {announcement.isActive ? translate("deactivate") : translate("activate")}
                        </Button>
                    </TableCell>
                    <TableCell>{format(announcement.createdAt.toDate(), 'PPP p')}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" onClick={() => setAnnouncementToDelete(announcement)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">{translate("delete")}</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{translate("deleteAnnouncementConfirmationTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {translate("deleteAnnouncementConfirmationDesc", { title: announcement.title})}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setAnnouncementToDelete(null)}>{translate("cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {translate("delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
