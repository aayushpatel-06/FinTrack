import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDNKvqx95B_tVtsd8bEWMdfWD8eALu-X0k",
  authDomain: "studentbudget-66dcc.firebaseapp.com",
  projectId: "studentbudget-66dcc",
  storageBucket: "studentbudget-66dcc.firebasestorage.app",
  messagingSenderId: "398984222542",
  appId: "1:398984222542:web:1c7d9e8a02c332f051b01f"
};

// 1. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Export the specific tools (The 'export' keyword is the most important part!)
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();