
"use client"; // Mark this component as a Client Component

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase'; // Import FCM functions

// Client component to handle FCM logic
export function FirebaseMessagingInitializer() {
  const { user } = useAuth(); // Get user from AuthContext
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.Worker) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
          // Request permission only if user is logged in
          if (user) {
            requestNotificationPermission().then(token => {
              if (token) {
                // TODO: Send this token to your backend server associated with the user
                console.log('FCM Token obtained:', token);
              }
            });
          }
        }).catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }
  }, [user]); // Re-run when user state changes

  useEffect(() => {
    // Listen for foreground messages
    if (user) { // Only listen if user is logged in
      const unsubscribePromise = onMessageListener()
        .then((payload: any) => {
            toast({
              title: payload?.notification?.title || "New Message",
              description: payload?.notification?.body || "You have a new message.",
            });
        })
        .catch(err => console.error('failed to listen for foreground message', err));
      
      // This part handles the potential promise that resolves to an unsubscribe function
      // or a direct unsubscribe function.
      let unsubscribeFunction: (() => void) | null = null;

      if (typeof unsubscribePromise === 'function') {
        unsubscribeFunction = unsubscribePromise as unknown as () => void;
      } else {
        // If it's a promise, resolve it to get the unsubscribe function
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

  return null; // This component does not render anything
}
