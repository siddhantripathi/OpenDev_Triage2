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
import { Ionicons } from '@expo/vector-icons';

// Services
import { FirebaseService } from '../services/firebaseService';
import { GitHubService } from '../services/githubService';
import { N8NService } from '../services/n8nService';

// Components
import { SuccessToast } from '../components/SuccessToast';

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
  const [showLimitReached, setShowLimitReached] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
      // Silent error handling
    }
  };

  const loadLatestAnalysis = async (uid: string) => {
    try {
      const analyses = await FirebaseService.getUserAnalyses(uid, 1);
      if (analyses.length > 0) {
        setLatestAnalysis(analyses[0]);
      }
    } catch (error) {
      // Silent error handling
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
    if (!user) {
      Alert.alert('Error', 'You must be logged in to analyze repositories');
      return;
    }

    try {
      // Check if user can analyze more repos
      const canAnalyze = await FirebaseService.canUserAnalyze(user.uid);
      
      if (!canAnalyze) {
        setShowLimitReached(true);
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
      const analysisResult = await N8NService.analyzeRepository(repoData);
      
      setLoadingMessage('Processing results...');
      const parsedAnalysis = N8NService.parseAnalysisResult(analysisResult);

      // Save analysis to database
      setLoadingMessage('Saving results...');
      const analysisId = await FirebaseService.saveAnalysis(user.uid, repoData, parsedAnalysis);
      
      await FirebaseService.decrementUserAttempts(user.uid);

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
      
      // Show success toast
      setSuccessMessage(`Analysis complete! Found ${parsedAnalysis.issues.length} ${parsedAnalysis.issues.length === 1 ? 'issue' : 'issues'}`);
      setShowSuccessToast(true);
      
      // Navigate to details after a brief delay
      setTimeout(() => {
        navigation.navigate('AnalysisDetail', { analysis: newAnalysis });
      }, 1000);

    } catch (error) {
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
      {/* Success Toast */}
      <SuccessToast
        visible={showSuccessToast}
        message={successMessage}
        onHide={() => setShowSuccessToast(false)}
      />

      {/* Limit Reached Overlay */}
      {showLimitReached && (
        <TouchableOpacity 
          style={styles.limitOverlay}
          activeOpacity={1}
          onPress={() => setShowLimitReached(false)}
        >
          <View style={styles.limitModal}>
            <View style={styles.limitIconContainer}>
              <Text style={styles.limitIcon}>🚫</Text>
            </View>
            <Text style={styles.limitTitle}>Analysis Limit Reached</Text>
            <Text style={styles.limitMessage}>
              You've used all 5 of your free analyses.{'\n\n'}
              To continue analyzing repositories, please contact support or check back later.
            </Text>
            <TouchableOpacity 
              style={styles.limitButton}
              onPress={() => setShowLimitReached(false)}
            >
              <Text style={styles.limitButtonText}>Got it</Text>
            </TouchableOpacity>
            <Text style={styles.limitHint}>Tap anywhere to dismiss</Text>
          </View>
        </TouchableOpacity>
      )}

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
          style={[
            styles.importButton,
            Platform.OS === 'web' && hoveredButton === 'import' && styles.importButtonHover
          ]}
          onPress={() => setShowImportInput(!showImportInput)}
          {...(Platform.OS === 'web' ? {
            onMouseEnter: () => setHoveredButton('import'),
            onMouseLeave: () => setHoveredButton(null),
          } : {})}
        >
          <Ionicons 
            name={showImportInput ? "close-circle-outline" : "cloud-download-outline"} 
            size={20} 
            color="#fff" 
          />
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
              style={[
                styles.importSubmitButton,
                Platform.OS === 'web' && hoveredButton === 'submit' && styles.importSubmitButtonHover
              ]}
              onPress={handleImportFromUrl}
              {...(Platform.OS === 'web' ? {
                onMouseEnter: () => setHoveredButton('submit'),
                onMouseLeave: () => setHoveredButton(null),
              } : {})}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
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
                    style={[
                      styles.analyzeButtonLarge,
                      Platform.OS === 'web' && hoveredButton === 'analyze' && styles.analyzeButtonHover,
                      loading && styles.analyzeButtonDisabled
                    ]}
                    onPress={() => handleAnalyzeRepo(selectedRepo)}
                    disabled={loading}
                    {...(Platform.OS === 'web' && !loading ? {
                      onMouseEnter: () => setHoveredButton('analyze'),
                      onMouseLeave: () => setHoveredButton(null),
                    } : {})}
                  >
                    <Ionicons name="analytics-outline" size={20} color="#fff" />
                    <Text style={styles.analyzeButtonText}>
                      Analyze {selectedRepo.name} ({selectedBranch})
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="git-branch-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Repositories Found</Text>
                <Text style={styles.emptyText}>
                  Connect your GitHub account or import a repository from URL to get started.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.emptyActionButton,
                    Platform.OS === 'web' && hoveredButton === 'emptyImport' && styles.emptyActionButtonHover
                  ]}
                  onPress={() => setShowImportInput(true)}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: () => setHoveredButton('emptyImport'),
                    onMouseLeave: () => setHoveredButton(null),
                  } : {})}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                  <Text style={styles.emptyActionText}>Import Repository</Text>
                </TouchableOpacity>
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
    flexDirection: 'row',
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    gap: 8,
  },
  importButtonHover: {
    backgroundColor: '#218838',
    transform: [{ scale: 1.02 }],
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
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  importSubmitButtonHover: {
    backgroundColor: '#0056b3',
    transform: [{ scale: 1.02 }],
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 300,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyActionButtonHover: {
    backgroundColor: '#BBDEFB',
  },
  emptyActionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
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
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analyzeButtonHover: {
    backgroundColor: '#0056b3',
    transform: [{ scale: 1.02 }],
  },
  analyzeButtonDisabled: {
    backgroundColor: '#99c2ff',
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  limitOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    padding: 20,
  },
  limitModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    // Web-compatible shadow
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    }),
  },
  limitIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  limitIcon: {
    fontSize: 48,
  },
  limitTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  limitMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  limitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 10,
  },
  limitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  limitHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
});
