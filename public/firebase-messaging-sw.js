
// public/firebase-messaging-sw.js
// IMPORTANT: This file needs to be in the public directory.

// Scripts for Firebase products (ensure you have the compat versions for service worker)
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Firebase configuration - Hardcoded values for service worker context
const firebaseConfig = {
  apiKey: "AIzaSyCG5PTHBhiIr3kGoB_Ip0CWpnydmEgriok",
  authDomain: "attandence-ce454.firebaseapp.com",
  projectId: "attandence-ce454",
  storageBucket: "attandence-ce454.firebasestorage.app",
  messagingSenderId: "190465524423",
  appId: "1:190465524423:web:16f8338841b549853934e2",
  measurementId: "G-6TQ4PRYWNL"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // if already initialized, use that one
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: payload.notification?.icon || '/icons/icon-192x192.png', // Default icon
    data: payload.data, // Pass along any data for click handling
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification);
  event.notification.close();

  const payloadData = event.notification.data;
  // Example: Open a specific URL or focus an existing window
  // const urlToOpen = payloadData && payloadData.url ? payloadData.url : '/';
  // event.waitUntil(clients.openWindow(urlToOpen));

  // For now, just focus or open the app's root
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
