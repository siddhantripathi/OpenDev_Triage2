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
import { User as FirebaseUser } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

// Services
import { FirebaseService } from '../services/firebaseService';

// Helper function for usage percentage (moved outside component for styles)
const getUsagePercentage = (userData: any): number => {
  if (!userData) return 0;
  return Math.min(100, (userData.attemptsUsed / 5) * 100);
};

export default function ProfileScreen() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = loadUserData();
    return () => {
      // Cleanup auth listener on unmount
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const loadUserData = () => {
    try {
      const unsubscribe = FirebaseService.onAuthStateChange(async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          const userDoc = await FirebaseService.getUser(firebaseUser.uid);
          setUserData(userDoc);
        }
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await FirebaseService.signOut();
              setUser(null);
              setUserData(null);
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getAttemptsRemaining = () => {
    if (!userData) return 0;
    return Math.max(0, 5 - userData.attemptsUsed);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="person-outline" size={64} color="#ccc" />
          <Text style={styles.title}>Not Signed In</Text>
          <Text style={styles.subtitle}>Please sign in to view your profile</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileIcon}>
          <Text style={styles.profileInitial}>
            {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{user.displayName || 'User'}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{getAttemptsRemaining()}</Text>
          <Text style={styles.statLabel}>Analyses Left</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userData?.attemptsUsed || 0}</Text>
          <Text style={styles.statLabel}>Used</Text>
        </View>
      </View>

      <View style={styles.usageContainer}>
        <View style={styles.usageHeader}>
          <Text style={styles.usageTitle}>Usage</Text>
          <Text style={styles.usageText}>{userData?.attemptsUsed || 0}/5</Text>
        </View>
        <View style={styles.usageBar}>
          <View
            style={[
              styles.usageProgress,
              {
                width: `${getUsagePercentage(userData)}%`,
                backgroundColor: getUsagePercentage(userData) > 80 ? '#ff6b6b' : '#007AFF'
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons name="checkmark-circle" size={20} color="#28a745" />
          <Text style={styles.infoText}>GitHub Connected</Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="shield-checkmark" size={20} color="#007AFF" />
          <Text style={styles.infoText}>Secure Authentication</Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="analytics" size={20} color="#ff6b6b" />
          <Text style={styles.infoText}>AI-Powered Analysis</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          OpenDev Triage v1.0
        </Text>
        <Text style={styles.footerSubtext}>
          Analyze repositories for issues and improvements
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Web-compatible shadow
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  usageContainer: {
    margin: 20,
    marginTop: 0,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  usageText: {
    fontSize: 14,
    color: '#666',
  },
  usageBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageProgress: {
    height: '100%',
    borderRadius: 4,
  },
  infoContainer: {
    margin: 20,
    marginTop: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    // Web-compatible shadow
    ...(Platform.OS === 'web' && {
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    }),
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
  },
});

