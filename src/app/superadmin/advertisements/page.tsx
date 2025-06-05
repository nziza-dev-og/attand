
// src/app/superadmin/advertisements/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, type FormEvent } from "react";
import { collection, addDoc, getDocs, query, orderBy, Timestamp, doc, updateDoc, deleteDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Edit, Trash2, Megaphone, Image as ImageIcon, Link as LinkIcon, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from 'date-fns';

interface Advertisement {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export default function ManageAdvertisementsPage() {
  const { user, loading: authLoading } = useAuth();
  const { translate } = useLanguage();
  const { toast } = useToast();

  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const [newAdTitle, setNewAdTitle] = useState("");
  const [newAdDescription, setNewAdDescription] = useState("");
  const [newAdImageUrl, setNewAdImageUrl] = useState("");
  const [newAdLinkUrl, setNewAdLinkUrl] = useState("");
  const [newAdIsActive, setNewAdIsActive] = useState(true);
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);

  const [adToDelete, setAdToDelete] = useState<Advertisement | null>(null);
  const [isDeletingAd, setIsDeletingAd] = useState(false);

  const fetchAdvertisements = async () => {
    if (authLoading || !user) return;
    setLoadingAds(true);
    try {
      const q = query(collection(db, "advertisements"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const adsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Advertisement));
      setAdvertisements(adsData);
    } catch (error) {
      console.error("Error fetching advertisements:", error);
      toast({ variant: "destructive", title: translate("errorTitle"), description: translate("errorLoadingAds") });
    } finally {
      setLoadingAds(false);
    }
  };

  useEffect(() => {
    fetchAdvertisements();
  }, [user, authLoading]);

  const handleAddAdSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAdTitle.trim() || !newAdDescription.trim()) {
      toast({ variant: "destructive", title: translate("validationErrorTitle"), description: translate("adTitleDescRequired") });
      return;
    }
    if (newAdImageUrl.trim() && !newAdImageUrl.trim().match(/^https?:\/\/.+/)) {
      toast({ variant: "destructive", title: translate("validationErrorTitle"), description: translate("adImageUrlInvalid") });
      return;
    }
    if (newAdLinkUrl.trim() && !newAdLinkUrl.trim().match(/^https?:\/\/.+/)) {
       toast({ variant: "destructive", title: translate("validationErrorTitle"), description: translate("adLinkUrlInvalid") });
       return;
    }

    setIsSubmittingAd(true);
    try {
      await addDoc(collection(db, "advertisements"), {
        title: newAdTitle.trim(),
        description: newAdDescription.trim(),
        imageUrl: newAdImageUrl.trim() || null,
        linkUrl: newAdLinkUrl.trim() || null,
        isActive: newAdIsActive,
        createdAt: Timestamp.now(),
      });
      toast({ title: translate("adAddedSuccessTitle"), description: translate("adAddedSuccessDesc") });
      resetAddAdForm();
      setIsAddDialogOpen(false);
      fetchAdvertisements();
    } catch (error) {
      console.error("Error adding advertisement:", error);
      toast({ variant: "destructive", title: translate("errorTitle"), description: translate("errorAddingAd") });
    } finally {
      setIsSubmittingAd(false);
    }
  };

  const resetAddAdForm = () => {
    setNewAdTitle("");
    setNewAdDescription("");
    setNewAdImageUrl("");
    setNewAdLinkUrl("");
    setNewAdIsActive(true);
  };

  const toggleAdStatus = async (ad: Advertisement) => {
    try {
      const adRef = doc(db, "advertisements", ad.id);
      await updateDoc(adRef, { isActive: !ad.isActive });
      toast({ title: translate("adStatusUpdatedTitle"), description: translate("adStatusUpdatedDesc") });
      fetchAdvertisements();
    } catch (error) {
      console.error("Error toggling ad status:", error);
      toast({ variant: "destructive", title: translate("errorTitle"), description: translate("errorUpdatingAdStatus") });
    }
  };
  
  const handleDeleteAd = async () => {
    if (!adToDelete) return;
    setIsDeletingAd(true);
    try {
      await deleteDoc(doc(db, "advertisements", adToDelete.id));
      toast({ title: translate("adDeletedSuccessTitle"), description: translate("adDeletedSuccessDesc", { title: adToDelete.title }) });
      fetchAdvertisements();
    } catch (error) {
      console.error("Error deleting ad:", error);
      toast({ variant: "destructive", title: translate("errorTitle"), description: translate("errorDeletingAd") });
    } finally {
      setIsDeletingAd(false);
      setAdToDelete(null);
    }
  };

  if (authLoading || loadingAds) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{translate("loadingAds")}</span>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Megaphone className="h-6 w-6" />{translate("manageAdvertisements")}</CardTitle>
            <CardDescription>{translate("manageAdvertisementsDesc")}</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetAddAdForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-4 w-4" />
                {translate("addAdvertisementButton")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{translate("addNewAdTitle")}</DialogTitle>
                <DialogDescription>{translate("addNewAdDesc")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddAdSubmit} className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ad-title">{translate("adTitleLabel")}</Label>
                  <Input id="ad-title" value={newAdTitle} onChange={(e) => setNewAdTitle(e.target.value)} placeholder={translate("adTitlePlaceholder")} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ad-description">{translate("adDescriptionLabel")}</Label>
                  <Textarea id="ad-description" value={newAdDescription} onChange={(e) => setNewAdDescription(e.target.value)} placeholder={translate("adDescriptionPlaceholder")} required rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ad-image-url" className="flex items-center gap-1"><ImageIcon className="h-4 w-4" />{translate("adImageUrlLabel")}</Label>
                  <Input id="ad-image-url" type="url" value={newAdImageUrl} onChange={(e) => setNewAdImageUrl(e.target.value)} placeholder="https://example.com/image.png" />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="ad-link-url" className="flex items-center gap-1"><LinkIcon className="h-4 w-4" />{translate("adLinkUrlLabel")}</Label>
                  <Input id="ad-link-url" type="url" value={newAdLinkUrl} onChange={(e) => setNewAdLinkUrl(e.target.value)} placeholder="https://example.com/learn-more" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="ad-is-active" checked={newAdIsActive} onCheckedChange={setNewAdIsActive} />
                  <Label htmlFor="ad-is-active">{translate("adIsActiveLabel")}</Label>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">{translate("cancelButton")}</Button></DialogClose>
                  <Button type="submit" disabled={isSubmittingAd}>
                    {isSubmittingAd && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {translate("addAdButton")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {advertisements.length === 0 && !loadingAds ? (
            <p className="text-center text-muted-foreground py-8">{translate("noAdsFound")}</p>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translate("adTitleLabel")}</TableHead>
                    <TableHead>{translate("adStatusLabel")}</TableHead>
                    <TableHead>{translate("adCreatedAtLabel")}</TableHead>
                    <TableHead className="text-right">{translate("actionsLabel")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advertisements.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell className="font-medium">{ad.title}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ad.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {ad.isActive ? translate("adStatusActive") : translate("adStatusInactive")}
                        </span>
                      </TableCell>
                      <TableCell>{format(ad.createdAt.toDate(), 'PPP p')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => toggleAdStatus(ad)} className="gap-1">
                           {ad.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                           {ad.isActive ? translate("deactivateAdButton") : translate("activateAdButton")}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={() => setAdToDelete(ad)} className="gap-1">
                              <Trash2 className="h-4 w-4" /> {translate("deleteButtonLabel")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{translate("deleteAdConfirmTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {translate("deleteAdConfirmDesc", { title: adToDelete?.title || "" })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setAdToDelete(null)}>{translate("cancelButton")}</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteAd} disabled={isDeletingAd}>
                                {isDeletingAd && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {translate("deleteButtonLabel")}
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
