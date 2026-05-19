import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBhVkTP1B425XmDNkAQjoXTYOkCr5T2HFI",
  authDomain: "acompanhamento-consultores.firebaseapp.com",
  databaseURL: "https://acompanhamento-consultores-default-rtdb.firebaseio.com",
  projectId: "acompanhamento-consultores",
  storageBucket: "acompanhamento-consultores.firebasestorage.app",
  messagingSenderId: "623792488916",
  appId: "1:623792488916:web:29c37d1e20eccc0b9ed641",
  measurementId: "G-9329SWHFBG"
};

// Global error interceptor
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    console.log("UNHANDLED ERROR:", event.reason);
  });
}

// Debug
console.log("FIREBASE APP: Initializing...");
console.log("PROJECT:", firebaseConfig.projectId);

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
export const storage = getStorage(app);

console.log("AUTH METHOD CALLED: getAuth");
console.log("AUTH INSTANCE:", auth);

// Analytics apenas se suportado
isSupported().then((yes) => {
  if (yes) {
    getAnalytics(app);
  }
});

export default app;
