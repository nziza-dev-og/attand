
// Ensure this is the very first line
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Skip waiting to activate the new service worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Claim clients to ensure the new service worker takes control immediately
  event.waitUntil(self.clients.claim());
});

// Import Firebase app and messaging scripts
try {
  importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');
} catch (e) {
  console.error('Service Worker: Error importing Firebase scripts.', e);
}

// Your web app's Firebase configuration
// IMPORTANT: These values should match your project's configuration.
// Using the fallback values from your src/lib/firebase.ts as an example.
// Ensure these are correct for your Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyCG5PTHBhiIr3kGoB_Ip0CWpnydmEgriok",
  authDomain: "attandence-ce454.firebaseapp.com",
  projectId: "attandence-ce454",
  storageBucket: "attandence-ce454.appspot.com", // Corrected to .appspot.com
  messagingSenderId: "190465524423",
  appId: "1:190465524423:web:16f8338841b549853934e2",
  measurementId: "G-6TQ4PRYWNL"
};

let app;
if (firebase.apps.length === 0) {
  try {
    app = firebase.initializeApp(firebaseConfig);
    console.log('Service Worker: Firebase app initialized.');
  } catch (e) {
    console.error('Service Worker: Firebase app initialization error.', e);
  }
} else {
  app = firebase.app(); // if already initialized, use that one
  console.log('Service Worker: Firebase app already initialized.');
}

let messaging;
if (app && typeof firebase.messaging === 'function') {
  try {
    messaging = firebase.messaging();
    console.log('Service Worker: Firebase Messaging initialized.');

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      // Customize notification here
      const notificationTitle = payload.notification?.title || 'AttendEase Notification';
      const notificationOptions = {
        body: payload.notification?.body || 'You have a new message.',
        icon: payload.notification?.icon || '/icons/icon-192x192.png', // Default icon
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (e) {
    console.error('Service Worker: Firebase Messaging initialization error.', e);
  }
} else {
  console.log('Service Worker: Firebase Messaging not available or app not initialized.');
}


// Basic fetch handler to make the PWA installable
self.addEventListener('fetch', (event) => {
  // console.log('Service Worker: Fetching:', event.request.url);
  // You can add more sophisticated caching strategies here if needed.
  // For now, just respond from the network.
  event.respondWith(fetch(event.request));
});

console.log('Service Worker: Script loaded and event listeners attached.');
