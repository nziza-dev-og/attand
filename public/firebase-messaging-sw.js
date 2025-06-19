// public/firebase-messaging-sw.js
// Scripts for firebase and firebase messaging
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Your web app's Firebase configuration
// Fallbacks are provided if environment variables are not set or replaced at build time.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCG5PTHBhiIr3kGoB_Ip0CWpnydmEgriok",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "attandence-ce454.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "attandence-ce454",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "attandence-ce454.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "190465524423",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:190465524423:web:16f8338841b549853934e2",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-6TQ4PRYWNL"
};

try {
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  onBackgroundMessage(messaging, (payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new message.',
      icon: payload.notification?.icon || '/icons/icon-192x192.png' // Default icon
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error("[firebase-messaging-sw.js] Error initializing Firebase or setting up background message handler:", error);
}

// Fetch handler: This is crucial for PWA installability.
self.addEventListener('fetch', (event) => {
  // For installability, simply responding to the fetch event is key.
  // A network-first or cache-first strategy can be implemented here for offline capabilities.
  // For now, a basic pass-through to the network.
  event.respondWith(fetch(event.request).catch(() => {
    // Optional: Fallback to a generic offline page or resource if fetch fails
    // For example: return caches.match('/offline.html');
    // For basic installability, simply catching the error is fine if no offline page.
  }));
});

self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installed');
  // Optional: Force the waiting service worker to become the active service worker.
  // event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated');
  // Optional: When the service worker is activated, claim clients.
  // This ensures that the service worker controls any open clients as soon as it's activated.
  // event.waitUntil(self.clients.claim());
});
