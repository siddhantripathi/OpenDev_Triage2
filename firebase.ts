import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with platform-specific persistence
let auth;
try {
  console.log('Initializing Firebase Auth...');
  console.log('Environment check - window:', typeof window !== 'undefined');
  console.log('Environment check - localStorage:', typeof window !== 'undefined' && window.localStorage);

  // Check if we're in a browser environment
  if (typeof window !== 'undefined' && window.localStorage) {
    console.log('Using browser persistence for web environment');
    // Web environment - use browser persistence
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence
    });
  } else {
    console.log('Using AsyncStorage persistence for React Native environment');
    // React Native environment - use AsyncStorage persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
  console.log('Firebase Auth initialized successfully');
} catch (error) {
  console.error('Firebase Auth initialization error:', error);
  // Fallback to basic auth initialization
  try {
    console.log('Attempting fallback auth initialization');
    auth = initializeAuth(app);
    console.log('Firebase Auth fallback initialized successfully');
  } catch (fallbackError) {
    console.error('Firebase Auth fallback initialization error:', fallbackError);
    throw fallbackError;
  }
}

// Initialize Cloud Firestore
const db = getFirestore(app);

export { auth, db };
export default app;
