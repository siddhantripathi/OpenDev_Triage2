import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { User as FirebaseUser } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

// Services
import { FirebaseService } from '../services/firebaseService';

// Types
import { UserAnalysis } from '../types';
import { HistoryStackParamList } from '../navigation/MainTabs';

type HistoryScreenNavigationProp = StackNavigationProp<HistoryStackParamList, 'HistoryMain'>;

export default function HistoryScreen() {
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [analyses, setAnalyses] = useState<UserAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = loadUserData();
    return () => {
      // Cleanup auth listener on unmount
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadAnalyses();
    }
  }, [user]);

  const loadUserData = () => {
    try {
      const unsubscribe = FirebaseService.onAuthStateChange((firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
        }
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadAnalyses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userAnalyses = await FirebaseService.getUserAnalyses(user.uid, 50);
      console.log('[HistoryScreen] Loaded', userAnalyses.length, 'analyses');
      setAnalyses(userAnalyses);
    } catch (error: any) {
      console.error('Error loading analyses:', error);
      
      // Check if it's the index error
      if (error?.message?.includes('index') || error?.code === 'failed-precondition') {
        if (Platform.OS === 'web') {
          alert('Firebase index is being created. Please wait a few minutes and refresh the page.');
        } else {
          Alert.alert(
            'Database Index Required',
            'Your Firebase database needs an index. Please create it in the Firebase Console and try again in a few minutes.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Error', 'Failed to load analysis history');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyses();
    setRefreshing(false);
  };

  const renderAnalysisItem = ({ item }: { item: UserAnalysis }) => (
    <TouchableOpacity style={styles.analysisItem}>
      <View style={styles.analysisHeader}>
        <View style={styles.repoInfo}>
          <Text style={styles.repoName}>{item.repoData.repo_name}</Text>
          <Text style={styles.repoOwner}>by {item.repoData.repo_owner}</Text>
        </View>
        <Text style={styles.analysisDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.issuesContainer}>
        <Text style={styles.issuesTitle}>
          Issues Found: {item.analysisResult.issues.length}
        </Text>

        {item.analysisResult.issues.length > 0 && (
          <View style={styles.issuesList}>
            {item.analysisResult.issues.slice(0, 3).map((issue, index) => (
              <View key={index} style={styles.issueItem}>
                <Ionicons name="alert-circle" size={16} color="#ff6b6b" />
                <Text style={styles.issueText} numberOfLines={2}>
                  {issue.length > 100 ? `${issue.substring(0, 100)}...` : issue}
                </Text>
              </View>
            ))}
            {item.analysisResult.issues.length > 3 && (
              <Text style={styles.moreIssuesText}>
                +{item.analysisResult.issues.length - 3} more issues
              </Text>
            )}
          </View>
        )}

        {item.analysisResult.prompt && (
          <View style={styles.promptContainer}>
            <Text style={styles.promptTitle}>Suggested Fixes:</Text>
            <Text style={styles.promptText} numberOfLines={3}>
              {item.analysisResult.prompt.length > 150
                ? `${item.analysisResult.prompt.substring(0, 150)}...`
                : item.analysisResult.prompt}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.viewDetailsButton}
        onPress={() => navigation.navigate('AnalysisDetail', { analysis: item })}
      >
        <Text style={styles.viewDetailsText}>View Full Analysis</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analysis History</Text>
        <Text style={styles.subtitle}>
          Your past repository analyses and results
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading analysis history...</Text>
        </View>
      ) : (
        <FlatList
          data={analyses}
          renderItem={renderAnalysisItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No analyses yet</Text>
              <Text style={styles.emptySubtext}>
                Your repository analyses will appear here
              </Text>
            </View>
          }
          contentContainerStyle={analyses.length === 0 ? styles.listContainer : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  analysisItem: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 10,
    padding: 15,
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
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  repoInfo: {
    flex: 1,
    marginRight: 15,
  },
  repoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  repoOwner: {
    fontSize: 14,
    color: '#666',
  },
  analysisDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  issuesContainer: {
    marginBottom: 15,
  },
  issuesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  issuesList: {
    marginBottom: 10,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingVertical: 5,
  },
  issueText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  moreIssuesText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 5,
  },
  promptContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  promptText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  viewDetailsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
