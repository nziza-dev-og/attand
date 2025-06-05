// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration or use environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCG5PTHBhiIr3kGoB_Ip0CWpnydmEgriok",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "attandence-ce454.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "attandence-ce454",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "attandence-ce454.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "190465524423",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:190465524423:web:16f8338841b549853934e2",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-6TQ4PRYWNL" // Added measurementId
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
let messagingInstance: Messaging | null = null;

if (typeof window !== 'undefined') {
  try {
    messagingInstance = getMessaging(app);
  } catch (error) {
    console.error("Failed to initialize Firebase Messaging:", error);
    // This can happen if FCM is not supported by the browser or in certain environments
    // (e.g., non-HTTPS, or if the service worker path is incorrect)
  }
}


export const requestNotificationPermission = async () => {
  if (!messagingInstance) {
    console.log("Firebase Messaging not initialized. Cannot request permission.");
    return null;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted.");
      // Get the token
      const currentToken = await getToken(messagingInstance, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY }); // Replace with your VAPID key
      if (currentToken) {
        console.log("FCM Token:", currentToken);
        // TODO: Send this token to your server and store it.
        return currentToken;
      } else {
        console.log("No registration token available. Request permission to generate one.");
        return null;
      }
    } else {
      console.log("Unable to get permission to notify.");
      return null;
    }
  } catch (error) {
    console.error("An error occurred while requesting permission or getting token:", error);
    return null;
  }
};

export const onMessageListener = () => {
  if (!messagingInstance) {
    console.log("Firebase Messaging not initialized. Cannot listen for messages.");
    return () => {}; // Return an empty unsubscribe function
  }
  return new Promise((resolve) => {
    onMessage(messagingInstance!, (payload) => { // Add non-null assertion operator
      console.log("Message received. ", payload);
      resolve(payload);
      // You can show an in-app notification here if the app is in the foreground
      // For example, using a toast notification
      // toast({ title: payload.notification?.title, description: payload.notification?.body });
    });
  });
};


export { app, auth, db, messagingInstance as messaging };
