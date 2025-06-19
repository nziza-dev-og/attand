// public/firebase-messaging-sw.js
// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// This is the same as in src/lib/firebase.ts, hardcoded for SW reliability
const firebaseConfig = {
  apiKey: "AIzaSyCG5PTHBhiIr3kGoB_Ip0CWpnydmEgriok",
  authDomain: "attandence-ce454.firebaseapp.com",
  projectId: "attandence-ce454",
  storageBucket: "attandence-ce454.appspot.com", // Standard appspot.com domain for storage bucket
  messagingSenderId: "190465524423",
  appId: "1:190465524423:web:16f8338841b549853934e2",
  measurementId: "G-6TQ4PRYWNL"
};

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase SW Initialized");
  }
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    console.log(
      "[firebase-messaging-sw.js] Received background message ",
      payload
    );
    const notificationTitle = payload.notification?.title || "AttendEase Notification";
    const notificationOptions = {
      body: payload.notification?.body || "You have a new message.",
      icon: "/icons/icon-192x192.png", // Ensure this icon exists in public/icons
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.error("Firebase SW Initialization Error", e);
}

self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  // Take control of all clients as soon as the SW is activated.
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A basic fetch handler is required for PWA installability.
  // This simple pass-through is often sufficient.
  // For offline capabilities, this would need to be more sophisticated.
  if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.warn('Service Worker: Fetch failed for', event.request.url, error);
        // Optionally, return a custom offline page or simple error response
        // return new Response("Network error occurred", { status: 408, headers: { 'Content-Type': 'text/plain' } });
      })
    );
  }
  // For non-GET requests or cross-origin requests, let the browser handle them normally
});
