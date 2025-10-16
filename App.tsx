import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, type Auth } from './firebase';

// Services
import { FirebaseService } from './services/firebaseService';

// Context
import { ThemeProvider } from './contexts/ThemeContext';

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// Screens
import AuthScreen from './screens/AuthScreen';
import MainTabs from './navigation/MainTabs';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[App] Starting App useEffect...');
    console.log('[App] Setting up auth state listener...');
    
    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('[App] Auth state changed:', firebaseUser ? 'User logged in' : 'No user');
        
        if (firebaseUser) {
          try {
            console.log('[App] Creating/updating user in Firestore...');
            // Create or update user in Firestore
            await FirebaseService.createOrUpdateUser(firebaseUser);
            console.log('[App] User created/updated successfully');
            setUser(firebaseUser);
          } catch (error) {
            console.error('[App] Error creating/updating user:', error);
            // Still set the user even if Firestore update fails
            setUser(firebaseUser);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
        console.log('[App] Loading complete');
      });

      return () => {
        console.log('[App] Cleaning up auth listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('[App] Error setting up auth listener:', error);
      setLoading(false);
      throw error;
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
