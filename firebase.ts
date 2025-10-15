import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.firebaseAppId || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId || process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Platform-specific auth initialization
let auth: Auth;
if (Platform.OS === 'web') {
  // Web: Use getAuth with default browser persistence
  auth = getAuth(app);
} else {
  // Native: Use initializeAuth with AsyncStorage wrapped properly
  auth = initializeAuth(app, {
    persistence: {
      type: 'LOCAL',
      async getItem(key: string) {
        return AsyncStorage.getItem(key);
      },
      async setItem(key: string, value: string) {
        await AsyncStorage.setItem(key, value);
      },
      async removeItem(key: string) {
        await AsyncStorage.removeItem(key);
      }
    } as any
  });
}

// Initialize Cloud Firestore
const db = getFirestore(app);

export { auth, db };
export type { Auth };
export default app;
