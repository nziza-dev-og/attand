
// src/components/shared/AdvertisementDisplay.tsx
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Megaphone, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);
  const { translate } = useLanguage();

  useEffect(() => {
    const fetchAd = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "advertisements"),
          where("isActive", "==", true),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          setAd({ id: querySnapshot.docs[0].id, ...docData } as Advertisement);
        } else {
          setAd(null);
        }
      } catch (error) {
        console.error("Error fetching advertisement:", error);
        setAd(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, []);

  if (loading) {
    // You can return a skeleton loader here if desired
    return null; 
  }

  if (!ad) {
    return null; // No active ad to display
  }

  return (
    <Card className="mb-6 border-primary/50 bg-primary/5 shadow-lg animate-in fade-in-50 slide-in-from-top-10 duration-500">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg text-primary">{ad.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ad.imageUrl && (
          <div className="aspect-video relative w-full max-h-48 overflow-hidden rounded-md">
            <Image 
              src={ad.imageUrl} 
              alt={ad.title} 
              fill 
              className="object-cover" 
              data-ai-hint="advertisement image" 
            />
          </div>
        )}
        <p className="text-sm text-foreground/80">{ad.description}</p>
      </CardContent>
      {ad.linkUrl && (
        <CardFooter className="pt-0">
          <Button asChild variant="outline" size="sm">
            <Link href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              {translate('learnMore') || 'Learn More'} <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
