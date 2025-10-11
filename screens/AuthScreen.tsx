import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { FirebaseService } from '../services/firebaseService';
import { User as FirebaseUser } from 'firebase/auth';

// Enable web browser completion in Expo (only for native platforms)
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  // Configure Google Sign-In with expo-auth-session (only for native platforms)
  const [request, response, promptAsync] = Platform.OS !== 'web' 
    ? Google.useAuthRequest({
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
      })
    : [null, null, null] as any;

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = FirebaseService.onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // User is signed in, reset loading
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Only watch for response on native platforms
    if (Platform.OS === 'web') return;
    
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.idToken) {
        handleGoogleSignIn(authentication.idToken);
      }
    } else if (response?.type === 'error' || response?.type === 'dismiss' || response?.type === 'cancel') {
      // Reset loading if auth was cancelled or errored
      setLoading(false);
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      setLoading(true);
      console.log('Signing in with Google ID token...');

      // Sign in with Firebase using the ID token
      await FirebaseService.signInWithGoogle(idToken);
      
      console.log('Google sign-in successful');
      // Don't set loading to false here - the auth state listener will handle it
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      let errorMessage = 'Failed to sign in with Google';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.code === 'auth/argument-error') {
        errorMessage = 'Authentication configuration error. Please check your Firebase setup.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log('Starting Google sign-in...');
      
      if (Platform.OS === 'web') {
        // Web: Use Firebase's native popup authentication
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        
        await signInWithPopup(auth, provider);
        console.log('Google sign-in successful (web)');
        // Auth state listener will handle the rest
      } else {
        // Native: Use expo-auth-session
        const result = await promptAsync();
        
        // If user cancels or there's an error, reset loading
        if (result.type !== 'success') {
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error('Google sign-in initiation error:', error);
      
      let errorMessage = 'Failed to sign in with Google';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Another sign-in popup is already open';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  };

  const openGitHubAuth = () => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID}&redirect_uri=${process.env.EXPO_PUBLIC_GITHUB_REDIRECT_URI}&scope=repo,read:user&state=opendev-triage`;

    if (Platform.OS === 'web') {
      window.open(githubAuthUrl, '_blank');
    } else {
      WebBrowser.openBrowserAsync(githubAuthUrl);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Signing in...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>OpenDev Triage</Text>
        <Text style={styles.subtitle}>Analyze your repositories for issues and improvements</Text>
      </View>

      <View style={styles.authContainer}>
        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={signInWithGoogle}
          disabled={loading || (Platform.OS !== 'web' && !request)}
        >
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </TouchableOpacity>

        {user && (
          <TouchableOpacity
            style={[styles.button, styles.githubButton]}
            onPress={openGitHubAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Connect GitHub Account</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By signing in, you agree to analyze up to 5 repositories
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  authContainer: {
    marginBottom: 40,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  githubButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
