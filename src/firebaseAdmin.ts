import * as admin from 'firebase-admin';
import serviceAccount from '../serviceAccountKey.json'; // Para desenvolvimento local

// Inicialização segura
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Em produção, usando variável de ambiente
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      ),
    });
    console.log('✅ Firebase Admin inicializado com variável de ambiente');
  } else if (serviceAccount) {
    // Em desenvolvimento, usando arquivo JSON
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    console.log('✅ Firebase Admin inicializado com serviceAccountKey.json');
  } else {
    console.warn('⚠️ Firebase Admin não inicializado. Verifique credenciais.');
  }
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth, admin };
