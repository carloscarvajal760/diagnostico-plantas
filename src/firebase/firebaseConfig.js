import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABhw1f2C0Vv-odjCYj-gMGVY5jsyhQAw4",
  authDomain: "plantas-2a5f8.firebaseapp.com",
  projectId: "plantas-2a5f8",
  storageBucket: "plantas-2a5f8.appspot.com",
  messagingSenderId: "265871605991",
  appId: "1:265871605991:web:a7ca6f17774f804b6c6242",
  measurementId: "G-KKHKPSFQKP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);