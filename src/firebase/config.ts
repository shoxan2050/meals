import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB9xdiRa2eFrooOD6BpN49Y4Uiey0DnvEw",
  authDomain: "meals-40b50.firebaseapp.com",
  projectId: "meals-40b50",
  storageBucket: "meals-40b50.firebasestorage.app",
  messagingSenderId: "578634758757",
  appId: "1:578634758757:web:cf9aad349280297a25e48c",
  measurementId: "G-SVL8FJE1E7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
