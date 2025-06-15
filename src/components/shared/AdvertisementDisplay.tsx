
// src/components/shared/AdvertisementDisplay.tsx
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Megaphone, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
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
  const [isFadingOut, setIsFadingOut] = useState(false);
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
        );
        const querySnapshot = await getDocs(q);
        const fetchedAds = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            createdAt: doc.data().createdAt as Timestamp // Ensure correct type
        } as Advertisement));
        setAds(fetchedAds);
        setCurrentAdIndex(0);
      } catch (error) {
        console.error("Error fetching advertisements:", error);
        setAds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return; // No need to cycle if 0 or 1 ad

    const cycleInterval = setInterval(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
        setIsFadingOut(false);
      }, 500); // Match fade-out duration
    }, 7000); // Change ad every 7 seconds (500ms fade + 6.5s display)

    return () => clearInterval(cycleInterval);
  }, [ads]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleNextAd = () => {
     if (ads.length === 0) return;
    setIsFadingOut(true);
    setTimeout(() => {
      setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
      setIsFadingOut(false);
    }, 300); // Shorter duration for manual navigation
  };

  const handlePrevAd = () => {
    if (ads.length === 0) return;
    setIsFadingOut(true);
    setTimeout(() => {
      setCurrentAdIndex((prevIndex) => (prevIndex - 1 + ads.length) % ads.length);
      setIsFadingOut(false);
    }, 300);
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
          <Skeleton className="h-32 w-full" /> {/* Placeholder for image */}
          <Skeleton className="h-4 w-full" /> {/* Placeholder for description line 1 */}
          <Skeleton className="h-4 w-2/3" /> {/* Placeholder for description line 2 */}
        </CardContent>
        <CardFooter className="pt-0">
          <Skeleton className="h-9 w-24" /> {/* Placeholder for button */}
        </CardFooter>
      </Card>
    );
  }

  if (!isVisible || ads.length === 0) {
    return null;
  }

  const currentAd = ads[currentAdIndex];

  return (
    <Card className={cn(
        "relative mb-6 border-primary/50 bg-primary/5 shadow-lg overflow-hidden",
        `transition-opacity duration-500 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`
      )}>
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
              priority={currentAdIndex === 0} // Prioritize loading the first image
            />
          </div>
        )}
        <p className="text-sm text-foreground/80 min-h-[40px]">{currentAd.description}</p>
      </CardContent>
      <CardFooter className={cn("pt-3 pb-4", ads.length > 1 ? "flex justify-between items-center" : "flex justify-start")}>
        {currentAd.linkUrl && (
          <Button asChild variant="outline" size="sm">
            <Link href={currentAd.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              {translate('learnMore') || 'Learn More'} <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        )}
        {ads.length > 1 && <div className={!currentAd.linkUrl ? "ml-auto" : ""}></div>} {/* Spacer if only nav buttons */}
        {ads.length > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrevAd} aria-label={translate('previousAd') || 'Previous ad'} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground mx-1">
              {currentAdIndex + 1} / {ads.length}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextAd} aria-label={translate('nextAd') || 'Next ad'} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
