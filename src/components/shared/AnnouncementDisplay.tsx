
// src/components/shared/AnnouncementDisplay.tsx
"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Speaker, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Announcement } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnnouncementDisplayProps {
  className?: string;
}

export function AnnouncementDisplay({ className }: AnnouncementDisplayProps) {
  const { user, loading: authLoading } = useAuth();
  const { translate } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (authLoading || !user) {
        if (!authLoading && !user) setLoading(false);
        return;
      }
      setLoading(true);
      setIsVisible(true); // Reset visibility when fetching
      try {
        const q = query(
          collection(db, "announcements"),
          where("isActive", "==", true),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const fetchedAnnouncements = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt as Timestamp // Ensure correct type
        } as Announcement));
        setAnnouncements(fetchedAnnouncements);
        setCurrentAnnouncementIndex(0);
      } catch (error) {
        console.error("Error fetching announcements:", error);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [user, authLoading]);

  useEffect(() => {
    if (announcements.length <= 1) return; // No need to cycle if 0 or 1 announcement

    const cycleInterval = setInterval(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setCurrentAnnouncementIndex((prevIndex) => (prevIndex + 1) % announcements.length);
        setIsFadingOut(false);
      }, 500); // Match fade-out duration
    }, 7000); // Change announcement every 7 seconds (500ms fade + 6.5s display)

    return () => clearInterval(cycleInterval);
  }, [announcements]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleNext = () => {
    if (announcements.length === 0) return;
    setIsFadingOut(true);
    setTimeout(() => {
      setCurrentAnnouncementIndex((prevIndex) => (prevIndex + 1) % announcements.length);
      setIsFadingOut(false);
    }, 300);
  };

  const handlePrev = () => {
     if (announcements.length === 0) return;
    setIsFadingOut(true);
    setTimeout(() => {
      setCurrentAnnouncementIndex((prevIndex) => (prevIndex - 1 + announcements.length) % announcements.length);
      setIsFadingOut(false);
    }, 300);
  };


  if (authLoading || loading) {
    return (
       <div className={cn("relative mb-6 p-4 flex items-center justify-center text-sm text-muted-foreground", className)}>
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {translate('loadingAnnouncements') || 'Loading announcements...'}
      </div>
    );
  }

  if (!isVisible || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentAnnouncementIndex];

  return (
    <Card className={cn("relative mb-6 border-blue-500/50 bg-blue-500/5 shadow-lg", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
        aria-label={translate('dismissAd') || 'Dismiss announcement'}
      >
        <X className="h-4 w-4" />
      </Button>
      <CardHeader className="pb-2 pr-10">
        <div className="flex items-center gap-2">
          <Speaker className="h-6 w-6 text-blue-600" />
          <CardTitle className={`text-md text-blue-700 transition-opacity duration-300 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
            {currentAnnouncement.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className={`text-sm text-foreground/90 transition-opacity duration-300 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
        <p className="min-h-[40px]">{currentAnnouncement.content}</p>
      </CardContent>
       {announcements.length > 1 && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={handlePrev} className="h-7 w-7">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext} className="h-7 w-7">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}
