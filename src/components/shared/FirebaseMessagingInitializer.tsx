
"use client"; 

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase'; 

export function FirebaseMessagingInitializer() {
  const { user } = useAuth(); 
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.Worker) {
      // Register the new sw.js
      navigator.serviceWorker.register('/sw.js') // Updated path
        .then((registration) => {
          console.log('Service Worker (sw.js) registered with scope:', registration.scope);
          // Request permission only if user is logged in for FCM (if still using FCM with this SW)
          if (user && registration.active) { // Check if SW is active before requesting token
            requestNotificationPermission().then(token => {
              if (token) {
                console.log('FCM Token obtained:', token);
              }
            }).catch(err => console.error('Error requesting notification permission or getting token:', err));
          }
        }).catch((err) => {
          console.error('Service Worker (sw.js) registration failed:', err);
        });
    }
  }, [user]); 

  useEffect(() => {
    if (user) { 
      const unsubscribePromise = onMessageListener()
        .then((payload: any) => {
            toast({
              title: payload?.notification?.title || "New Message",
              description: payload?.notification?.body || "You have a new message.",
            });
        })
        .catch(err => console.error('failed to listen for foreground message', err));
      
      let unsubscribeFunction: (() => void) | null = null;

      if (typeof unsubscribePromise === 'function') {
        unsubscribeFunction = unsubscribePromise as unknown as () => void;
      } else {
        Promise.resolve(unsubscribePromise).then(unsub => {
          if (typeof unsub === 'function') {
            unsubscribeFunction = unsub as unknown as () => void;
          }
        }).catch(err => console.error('Error resolving unsubscribe from onMessageListener:', err));
      }
      
      return () => {
        if (unsubscribeFunction) {
          unsubscribeFunction();
        }
      };
    }
  }, [user, toast]);

  return null; 
}
