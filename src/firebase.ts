
// Importa as funções necessárias
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Not used, can be removed if not needed
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuração do seu projeto Firebase
// Make sure to export firebaseConfig so it can be used for secondary app instances
export const firebaseConfig = {
  apiKey: "AIzaSyCoqOk3q5nfNRDL1tY2abLlTa5nhqq1TDU",
  authDomain: "clinipratica-d5519.firebaseapp.com",
  projectId: "clinipratica-d5519",
  storageBucket: "clinipratica-d5519.appspot.com", // Corrected storageBucket name
  messagingSenderId: "551870373506",
  appId: "1:551870373506:web:201dad4f2fad73e6c5de9b",
  measurementId: "G-1QXWLN3487"
};

// Initialize Firebase (main app instance)
const app = initializeApp(firebaseConfig);

// Exporta os serviços que você vai usar
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
