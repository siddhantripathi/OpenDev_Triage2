import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { User as FirebaseUser } from 'firebase/auth';

// Services
import { FirebaseService } from '../services/firebaseService';
import { GitHubService } from '../services/githubService';
import { N8NService } from '../services/n8nService';

// Types
import { GitHubRepo, RepoData, UserAnalysis } from '../types';
import { HomeStackParamList } from '../navigation/MainTabs';

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'HomeMain'>;

export default function HomeScreen() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [showImportInput, setShowImportInput] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<UserAnalysis | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<Array<{ name: string }>>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [loadingBranches, setLoadingBranches] = useState(false);

  const navigation = useNavigation<HomeScreenNavigationProp>();

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
    if (userData?.githubToken && user) {
      loadRepos();
    }
  }, [userData, user]);

  useEffect(() => {
    filterRepos();
  }, [searchQuery, repos]);

  useEffect(() => {
    if (selectedRepo && userData?.githubToken) {
      loadBranches();
    }
  }, [selectedRepo]);

  const loadUserData = () => {
    try {
      const unsubscribe = FirebaseService.onAuthStateChange((firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          FirebaseService.getUser(firebaseUser.uid).then(userDoc => {
            setUserData(userDoc);
          });
          // Load latest analysis
          loadLatestAnalysis(firebaseUser.uid);
        }
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadLatestAnalysis = async (uid: string) => {
    try {
      const analyses = await FirebaseService.getUserAnalyses(uid, 1);
      if (analyses.length > 0) {
        setLatestAnalysis(analyses[0]);
      }
    } catch (error) {
      console.error('[HomeScreen] Error loading latest analysis:', error);
    }
  };

  const loadBranches = async () => {
    if (!selectedRepo || !userData?.githubToken) return;
    
    try {
      setLoadingBranches(true);
      const repoBranches = await GitHubService.getRepoBranches(
        userData.githubToken,
        selectedRepo.owner.login,
        selectedRepo.name
      );
      setBranches(repoBranches);
      
      // Set default branch
      const defaultBranch = GitHubService.getDefaultBranch(repoBranches);
      setSelectedBranch(defaultBranch);
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([]);
      setSelectedBranch('main');
    } finally {
      setLoadingBranches(false);
    }
  };

  const loadRepos = async () => {
    if (!userData?.githubToken) return;

    try {
      setLoading(true);
      const userRepos = await GitHubService.getUserRepos(userData.githubToken);
      setRepos(userRepos);
    } catch (error) {
      console.error('Error loading repos:', error);
      Alert.alert('Error', 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const filterRepos = () => {
    if (!searchQuery.trim()) {
      setFilteredRepos(repos);
    } else {
      const filtered = repos.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRepos(filtered);
    }
  };

  const handleImportFromUrl = () => {
    if (!importUrl.trim()) {
      Alert.alert('Error', 'Please enter a repository URL');
      return;
    }

    const parsed = GitHubService.parseRepoUrl(importUrl.trim());
    if (!parsed) {
      Alert.alert('Error', 'Please enter a valid GitHub repository URL');
      return;
    }

    // Create a mock repo object for the imported repo
    const importedRepo: GitHubRepo = {
      id: 0,
      name: parsed.name,
      full_name: `${parsed.owner}/${parsed.name}`,
      owner: {
        login: parsed.owner,
        avatar_url: '',
      },
      description: 'Imported repository',
      html_url: `https://github.com/${parsed.owner}/${parsed.name}`,
      stargazers_count: 0,
      language: null,
      updated_at: new Date().toISOString(),
    };

    handleAnalyzeRepo(importedRepo);
    setShowImportInput(false);
    setImportUrl('');
  };

  const handleAnalyzeRepo = async (repo: GitHubRepo) => {
    if (!user) return;

    try {
      // Check if user can analyze more repos
      const canAnalyze = await FirebaseService.canUserAnalyze(user.uid);
      if (!canAnalyze) {
        Alert.alert(
          'Limit Reached',
          'You have reached the maximum of 5 analyses. Please contact support for more.'
        );
        return;
      }

      setLoading(true);
      setLoadingMessage('Preparing repository data...');

      const repoData: RepoData = {
        repo_owner: repo.owner.login,
        branch: selectedBranch, // Use selected branch
        repo_name: repo.name,
      };

      // Call n8n webhook for analysis
      setLoadingMessage('Analyzing repository (this may take 20-30 seconds)...');
      console.log('[HomeScreen] Starting analysis...');
      const analysisResult = await N8NService.analyzeRepository(repoData);
      console.log('[HomeScreen] Analysis completed');
      
      setLoadingMessage('Processing results...');
      const parsedAnalysis = N8NService.parseAnalysisResult(analysisResult);
      console.log('[HomeScreen] Parsed', parsedAnalysis.issues.length, 'issues');

      // Save analysis to database
      setLoadingMessage('Saving results...');
      console.log('[HomeScreen] Saving to Firebase...');
      const analysisId = await FirebaseService.saveAnalysis(user.uid, repoData, parsedAnalysis);
      console.log('[HomeScreen] Saved with ID:', analysisId);
      
      await FirebaseService.decrementUserAttempts(user.uid);
      console.log('[HomeScreen] Incremented attempts');

      // Create the analysis object to display
      const newAnalysis: UserAnalysis = {
        id: analysisId,
        userId: user.uid,
        repoData,
        analysisResult: parsedAnalysis,
        createdAt: new Date(),
        attempts: 1,
      };
      
      // Update latest analysis to show on homepage
      setLatestAnalysis(newAnalysis);

      setLoading(false);
      setLoadingMessage('');
      
      console.log('[HomeScreen] Showing success message');
      
      // Show success - use web-compatible alert
      if (Platform.OS === 'web') {
        // On web, use a simple alert and navigate
        const viewDetails = window.confirm(
          `Success! Found ${parsedAnalysis.issues.length} issues. View detailed analysis?`
        );
        if (viewDetails) {
          navigation.navigate('AnalysisDetail', { analysis: newAnalysis });
        }
      } else {
        // On native, use Alert.alert
        Alert.alert(
          'Success!', 
          `Found ${parsedAnalysis.issues.length} issues. View detailed analysis?`,
          [
            {
              text: 'View Details',
              onPress: () => navigation.navigate('AnalysisDetail', { analysis: newAnalysis })
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }

    } catch (error) {
      console.error('[HomeScreen] Error analyzing repo:', error);
      setLoading(false);
      setLoadingMessage('');
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to analyze repository');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRepos();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Repository Analysis</Text>
        <Text style={styles.subtitle}>
          Select a repository to analyze or import from URL
        </Text>

        {userData && (
          <Text style={styles.attemptsText}>
            Analyses remaining: {userData.attemptsLeft}
          </Text>
        )}
      </View>

      {latestAnalysis && (
        <View style={styles.latestAnalysisContainer}>
          <View style={styles.latestAnalysisHeader}>
            <Text style={styles.latestAnalysisTitle}>Latest Analysis</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('AnalysisDetail', { analysis: latestAnalysis })}
            >
              <Text style={styles.viewDetailsLink}>View Details →</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.latestAnalysisCard}
            onPress={() => navigation.navigate('AnalysisDetail', { analysis: latestAnalysis })}
          >
            <View style={styles.latestAnalysisInfo}>
              <Text style={styles.latestRepoName}>{latestAnalysis.repoData.repo_name}</Text>
              <Text style={styles.latestRepoOwner}>by {latestAnalysis.repoData.repo_owner}</Text>
              <Text style={styles.latestDate}>
                {new Date(latestAnalysis.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.latestIssuesCount}>
              <Text style={styles.issuesCountNumber}>{latestAnalysis.analysisResult.issues.length}</Text>
              <Text style={styles.issuesCountLabel}>Issues Found</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.importButton}
          onPress={() => setShowImportInput(!showImportInput)}
        >
          <Text style={styles.importButtonText}>
            {showImportInput ? 'Cancel Import' : 'Import from URL'}
          </Text>
        </TouchableOpacity>

        {showImportInput && (
          <View style={styles.importContainer}>
            <TextInput
              style={styles.importInput}
              placeholder="https://github.com/owner/repo"
              value={importUrl}
              onChangeText={setImportUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.importSubmitButton}
              onPress={handleImportFromUrl}
            >
              <Text style={styles.importSubmitText}>Import</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search repositories..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{loadingMessage || 'Loading...'}</Text>
        </View>
      ) : null}
      
      <ScrollView style={styles.pickerScrollView} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
        {!loading && (
          <>
            {repos.length > 0 ? (
              <>
                <View style={styles.repoPickerContainer}>
                  <Text style={styles.pickerLabel}>Select Repository</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={selectedRepo?.id.toString() || ''}
                      onValueChange={(itemValue) => {
                        const repo = filteredRepos.find(r => r.id.toString() === itemValue);
                        setSelectedRepo(repo || null);
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="Choose a repository..." value="" />
                      {filteredRepos.map((repo) => (
                        <Picker.Item
                          key={repo.id}
                          label={`${repo.name} (${repo.owner.login})`}
                          value={repo.id.toString()}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                {selectedRepo && (
                  <View style={styles.branchPickerContainer}>
                    <Text style={styles.pickerLabel}>Select Branch</Text>
                    <View style={styles.pickerWrapper}>
                      {loadingBranches ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                      ) : branches.length > 0 ? (
                        <Picker
                          selectedValue={selectedBranch}
                          onValueChange={setSelectedBranch}
                          style={styles.picker}
                        >
                          {branches.map((branch) => (
                            <Picker.Item
                              key={branch.name}
                              label={branch.name}
                              value={branch.name}
                            />
                          ))}
                        </Picker>
                      ) : (
                        <Text style={styles.noBranchesText}>No branches found</Text>
                      )}
                    </View>
                  </View>
                )}

                {selectedRepo && selectedBranch && (
                  <TouchableOpacity
                    style={styles.analyzeButtonLarge}
                    onPress={() => handleAnalyzeRepo(selectedRepo)}
                    disabled={loading}
                  >
                    <Text style={styles.analyzeButtonText}>
                      Analyze {selectedRepo.name} ({selectedBranch})
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No repositories found. Connect your GitHub account or import from URL.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    marginBottom: 10,
  },
  attemptsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  latestAnalysisContainer: {
    padding: 20,
    paddingTop: 10,
  },
  latestAnalysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  latestAnalysisTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  viewDetailsLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  latestAnalysisCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  latestAnalysisInfo: {
    flex: 1,
  },
  latestRepoName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  latestRepoOwner: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  latestDate: {
    fontSize: 12,
    color: '#999',
  },
  latestIssuesCount: {
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    minWidth: 80,
  },
  issuesCountNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ff6b6b',
    marginBottom: 4,
  },
  issuesCountLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  controls: {
    padding: 20,
  },
  importButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  importContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  importInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  importSubmitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  importSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 20,
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
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  pickerScrollView: {
    flex: 1,
  },
  repoPickerContainer: {
    padding: 20,
    paddingTop: 10,
  },
  branchPickerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  noBranchesText: {
    padding: 15,
    color: '#999',
    textAlign: 'center',
  },
  analyzeButtonLarge: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
