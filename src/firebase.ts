// Importa as funções necessárias
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCoqOk3q5nfNRDL1tY2abLlTa5nhqq1TDU",
  authDomain: "clinipratica-d5519.firebaseapp.com",
  projectId: "clinipratica-d5519",
  storageBucket: "clinipratica-d5519.firebasestorage.app",
  messagingSenderId: "551870373506",
  appId: "1:551870373506:web:201dad4f2fad73e6c5de9b",
  measurementId: "G-1QXWLN3487"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços que você vai usar
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app)

export { auth, db, storage };
