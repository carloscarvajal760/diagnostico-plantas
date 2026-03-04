// Importa funciones necesarias de Firebase
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyABhw1f2C0Vv-odjCYj-gMGVY5jsyhQAw4",
  authDomain: "plantas-2a5f8.firebaseapp.com",
  projectId: "plantas-2a5f8",
  storageBucket: "plantas-2a5f8.appspot.com",
  messagingSenderId: "265871605991",
  appId: "1:265871605991:web:a7ca6f17774f804b6c6242",
  measurementId: "G-KKHKPSFQKP"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa servicios
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Exporta todo de manera nombrada
export { app, auth, provider };
