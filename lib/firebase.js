// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBZg-H41uWmGItuMFseiciIyljBQHl2qWQ",
  authDomain: "ai-chatbot-5703b.firebaseapp.com",
  projectId: "ai-chatbot-5703b",
  storageBucket: "ai-chatbot-5703b.appspot.com",
  messagingSenderId: "195135541693",
  appId: "1:195135541693:web:e0ec4dd23e19787d3782d4",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
