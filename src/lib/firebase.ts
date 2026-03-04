import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
