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
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth } from '../firebase';
import { FirebaseService } from '../services/firebaseService';
import { User as FirebaseUser } from 'firebase/auth';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log('Starting Google sign-in...');

      // Use Firebase's Google Auth Provider
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      console.log('Auth object:', auth);
      console.log('Provider:', provider);

      // Use redirect for both web and mobile (Expo web has popup limitations)
      await signInWithRedirect(auth, provider);
      console.log('signInWithRedirect completed');
    } catch (error) {
      console.error('Google sign-in error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      Alert.alert('Error', `Failed to sign in with Google: ${error.message}`);
    } finally {
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
          disabled={loading}
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
