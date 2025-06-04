// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Your web app's Firebase configuration
// You need to get these values from your Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyDENZEhFT_rczFfE2noEzsPAybuEztOwGI",
  authDomain: "texttotube-259fd.firebaseapp.com",
  projectId: "texttotube-259fd",
  storageBucket: "texttotube-259fd.appspot.com",
  messagingSenderId: "372219393555",
  appId: "1:372219393555:web:275f42c8c39a9463de71e6",
  measurementId: "G-BH8BXH5MNL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google provider
export const googleProvider = new GoogleAuthProvider();

export default app;