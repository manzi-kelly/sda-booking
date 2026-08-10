// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxq03OViOqvSkNuejJErUXcShyREURpRM",
  authDomain: "sda-booking-4c195.firebaseapp.com",
  projectId: "sda-booking-4c195",
  storageBucket: "sda-booking-4c195.firebasestorage.app",
  messagingSenderId: "26676496217",
  appId: "1:26676496217:web:fe2f9bbdbc444133942e48",
  measurementId: "G-6GNQJKBSHE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (err) {
  console.warn("Firebase Analytics unavailable:", err.message);
}

export const auth = getAuth(app);
export { app, analytics };
