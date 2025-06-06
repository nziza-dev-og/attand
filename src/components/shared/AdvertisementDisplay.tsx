
// src/components/shared/AdvertisementDisplay.tsx
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Megaphone, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react'; // Added Chevron icons
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { cn } from '@/lib/utils';

interface Advertisement {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export function AdvertisementDisplay() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const { translate } = useLanguage();

  useEffect(() => {
    const fetchAds = async () => {
      setLoading(true);
      setIsVisible(true); 
      try {
        const q = query(
          collection(db, "advertisements"),
          where("isActive", "==", true),
          orderBy("createdAt", "desc")
          // Removed limit(1) to fetch all active ads
        );
        const querySnapshot = await getDocs(q);
        const fetchedAds = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Advertisement));
        setAds(fetchedAds);
        setCurrentAdIndex(0); // Reset to first ad
      } catch (error) {
        console.error("Error fetching advertisements:", error);
        setAds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleNextAd = () => {
    setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
  };

  const handlePrevAd = () => {
    setCurrentAdIndex((prevIndex) => (prevIndex - 1 + ads.length) % ads.length);
  };

  if (loading) {
    return (
      <Card className="relative mb-6 border-primary/50 bg-primary/5 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
        <CardFooter className="pt-0">
          <Skeleton className="h-9 w-24" />
        </CardFooter>
      </Card>
    );
  }

  if (!isVisible || ads.length === 0) {
    return null;
  }

  const currentAd = ads[currentAdIndex];

  return (
    <Card className="relative mb-6 border-primary/50 bg-primary/5 shadow-lg animate-in fade-in-50 slide-in-from-top-10 duration-500">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
        aria-label={translate('dismissAd') || 'Dismiss advertisement'}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardHeader className="pb-3 pr-10">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          <CardTitle className="text-lg text-primary">{currentAd.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentAd.imageUrl && (
          <div className="aspect-video relative w-full max-h-48 overflow-hidden rounded-md">
            <Image
              src={currentAd.imageUrl}
              alt={currentAd.title}
              fill
              className="object-cover"
              data-ai-hint="advertisement image"
            />
          </div>
        )}
        <p className="text-sm text-foreground/80">{currentAd.description}</p>
      </CardContent>
      <CardFooter className={cn("pt-0", ads.length > 1 ? "flex justify-between items-center" : "")}>
        {currentAd.linkUrl && (
          <Button asChild variant="outline" size="sm">
            <Link href={currentAd.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              {translate('learnMore') || 'Learn More'} <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        )}
         {ads.length > 1 && <div className={!currentAd.linkUrl ? "ml-auto" : ""}></div>} 
         {/* Spacer if only nav buttons */}
        {ads.length > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevAd} aria-label={translate('previousAd') || 'Previous ad'}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentAdIndex + 1} / {ads.length}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextAd} aria-label={translate('nextAd') || 'Next ad'}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
