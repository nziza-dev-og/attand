
// Scripts for Firebase and Firebase Messaging
// IMPORTANT: Use specific versions matching your project's Firebase SDK version
// For example, if your project uses Firebase v9.x.x, use compat scripts for v9.x.x.
// If using v10 or later, the SDK setup is slightly different.
// Assuming compat scripts for wide compatibility as per current firebase.ts structure.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker.
// IMPORTANT: These values MUST be hardcoded or fetched from a config file.
// They CANNOT use process.env at runtime in the browser's service worker.
// Using the fallback values from your src/lib/firebase.ts as an example.
// REPLACE THESE WITH YOUR ACTUAL FIREBASE CONFIG VALUES.
const firebaseConfig = {
  apiKey: "AIzaSyCG5PTHBhiIr3kGoB_Ip0CWpnydmEgriok",
  authDomain: "attandence-ce454.firebaseapp.com",
  projectId: "attandence-ce454",
  storageBucket: "attandence-ce454.appspot.com", // Corrected: .appspot.com is common
  messagingSenderId: "190465524423",
  appId: "1:190465524423:web:16f8338841b549853934e2",
  measurementId: "G-6TQ4PRYWNL"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
if (firebase.messaging.isSupported()) {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification?.title || 'AttendEase Notification';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new message.',
      icon: '/icons/icon-192x192.png', // Default icon for notifications
      // You can add more options like badge, image, actions, etc.
    };

    // self.registration is a ServiceWorkerRegistration object
    if (self.registration) {
      self.registration.showNotification(notificationTitle, notificationOptions);
    } else {
      console.error("[firebase-messaging-sw.js] self.registration is not available. Cannot show notification.");
    }
  });
} else {
  console.log('[firebase-messaging-sw.js] Firebase Messaging is not supported in this browser.');
}

// Basic no-op fetch handler to help make the PWA installable.
// This does NOT provide offline functionality.
// For full offline support, you'd implement caching strategies here.
self.addEventListener('fetch', (event) => {
  // event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
  // For now, just let the network handle it to keep it simple.
  return;
});

self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installed');
  // event.waitUntil(self.skipWaiting()); // Optional: activate new SW immediately
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated');
  // event.waitUntil(self.clients.claim()); // Optional: take control of open clients immediately
});
