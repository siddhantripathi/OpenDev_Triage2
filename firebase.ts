import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

console.log('[Firebase] Starting Firebase initialization...');
console.log('[Firebase] Platform:', Platform.OS);

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.firebaseAppId || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId || process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

console.log('[Firebase] Config loaded:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  hasAppId: !!firebaseConfig.appId,
});

// Validate Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('[Firebase] Firebase config missing required fields:', firebaseConfig);
  throw new Error('Firebase configuration is incomplete. Missing apiKey or projectId.');
}

// Initialize Firebase
console.log('[Firebase] Initializing Firebase app...');
const app = initializeApp(firebaseConfig);
console.log('[Firebase] Firebase app initialized successfully');

// Platform-specific auth initialization
let auth: Auth;
try {
  if (Platform.OS === 'web') {
    console.log('[Firebase] Initializing auth for web...');
    // Web: Use getAuth with default browser persistence
    auth = getAuth(app);
  } else {
    console.log('[Firebase] Initializing auth for native with AsyncStorage...');
    // Native: Use initializeAuth with AsyncStorage - try simpler approach first
    auth = initializeAuth(app, {
      persistence: {
        type: 'LOCAL',
        async getItem(key: string): Promise<string | null> {
          return await AsyncStorage.getItem(key);
        },
        async setItem(key: string, value: string): Promise<void> {
          await AsyncStorage.setItem(key, value);
        },
        async removeItem(key: string): Promise<void> {
          await AsyncStorage.removeItem(key);
        }
      } as any
    });
  }
  console.log('[Firebase] Auth initialized successfully');
} catch (error) {
  console.error('[Firebase] Error initializing auth:', error);
  throw error;
}

// Initialize Cloud Firestore
console.log('[Firebase] Initializing Firestore...');
const db = getFirestore(app);
console.log('[Firebase] Firestore initialized successfully');
console.log('[Firebase] All Firebase services ready');

export { auth, db };
export type { Auth };
export default app;
