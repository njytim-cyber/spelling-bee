import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAc3X0hdVSQC01ZQ8ty3k8H3IwsThAXhN4',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'scribble-math-prod.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'scribble-math-prod',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'scribble-math-prod.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '60445191230',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:60445191230:web:c00230ef05f6bdd903356f',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with multi-tab persistent cache
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
