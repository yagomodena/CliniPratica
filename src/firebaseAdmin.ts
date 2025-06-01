
import * as admin from 'firebase-admin';

// Ensure this path is correct for your project structure
// import serviceAccount from '../serviceAccountKey.json'; // Path to your service account key JSON file

// Use environment variables for Firebase Admin SDK configuration in production/Vercel
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;


if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com` // Optional: if using Realtime Database
    });
    console.log("Firebase Admin SDK initialized with service account.");
  } else if (process.env.VERCEL_ENV) { // VERCEL_ENV is set by Vercel
     // For Vercel deployment, Firebase Admin SDK can auto-initialize with Application Default Credentials
     // if the service account has the right IAM permissions and is linked to the project.
     admin.initializeApp();
     console.log("Firebase Admin SDK initialized with Application Default Credentials (Vercel).");
  } else {
    console.warn(
        "Firebase Admin SDK NOT initialized. Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable or not in Vercel environment with ADC."
    );
    // For local development without a service account JSON file, you might need to set up ADC
    // or provide the JSON. Without initialization, server-side Firestore operations will fail.
  }
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth, admin };
