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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { User as FirebaseUser } from 'firebase/auth';

// Services
import { FirebaseService } from '../services/firebaseService';
import { GitHubService } from '../services/githubService';
import { N8NService } from '../services/n8nService';

// Types
import { GitHubRepo, RepoData, UserAnalysis } from '../types';
import { RootStackParamList } from '../App';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [showImportInput, setShowImportInput] = useState(false);

  const navigation = useNavigation<HomeScreenNavigationProp>();

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userData?.githubToken && user) {
      loadRepos();
    }
  }, [userData, user]);

  useEffect(() => {
    filterRepos();
  }, [searchQuery, repos]);

  const loadUserData = async () => {
    try {
      const currentUser = FirebaseService.onAuthStateChange((firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          FirebaseService.getUser(firebaseUser.uid).then(userDoc => {
            setUserData(userDoc);
          });
        }
      });
    } catch (error) {
      console.error('Error loading user data:', error);
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

      const repoData: RepoData = {
        repo_owner: repo.owner.login,
        branch: 'main',
        repo_name: repo.name,
      };

      // Call n8n webhook for analysis
      const analysisResult = await N8NService.analyzeRepository(repoData);
      const parsedAnalysis = N8NService.parseAnalysisResult(analysisResult);

      // Save analysis to database
      await FirebaseService.saveAnalysis(user.uid, repoData, parsedAnalysis);
      await FirebaseService.incrementUserAttempts(user.uid);

      // Navigate to results screen
      navigation.navigate('Main' as never);

      Alert.alert('Success', 'Repository analysis completed!');

    } catch (error) {
      console.error('Error analyzing repo:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to analyze repository');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRepos();
    setRefreshing(false);
  };

  const renderRepoItem = ({ item }: { item: GitHubRepo }) => (
    <TouchableOpacity
      style={styles.repoItem}
      onPress={() => handleAnalyzeRepo(item)}
      disabled={loading}
    >
      <View style={styles.repoHeader}>
        <View style={styles.repoInfo}>
          <Text style={styles.repoName}>{item.name}</Text>
          <Text style={styles.repoFullName}>{item.full_name}</Text>
        </View>
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={() => handleAnalyzeRepo(item)}
          disabled={loading}
        >
          <Text style={styles.analyzeButtonText}>Analyze</Text>
        </TouchableOpacity>
      </View>

      {item.description && (
        <Text style={styles.repoDescription}>{item.description}</Text>
      )}

      <View style={styles.repoMeta}>
        {item.language && (
          <View style={styles.languageContainer}>
            <View style={[styles.languageDot, { backgroundColor: getLanguageColor(item.language) }]} />
            <Text style={styles.repoLanguage}>{item.language}</Text>
          </View>
        )}
        <Text style={styles.repoStars}>⭐ {item.stargazers_count}</Text>
      </View>
    </TouchableOpacity>
  );

  const getLanguageColor = (language: string): string => {
    const colors: { [key: string]: string } = {
      JavaScript: '#f1e05a',
      TypeScript: '#2b7489',
      Python: '#3572A5',
      Java: '#b07219',
      'C++': '#f34b7d',
      C: '#555555',
      'C#': '#239120',
      PHP: '#4F5D95',
      Ruby: '#701516',
      Go: '#00ADD8',
      Rust: '#dea584',
      Swift: '#ffac45',
      Kotlin: '#F18E33',
      Scala: '#c22d40',
    };
    return colors[language] || '#586069';
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
            Attempts remaining: {Math.max(0, 5 - userData.attemptsUsed)}
          </Text>
        )}
      </View>

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading repositories...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRepos}
          renderItem={renderRepoItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {repos.length === 0
                  ? 'No repositories found. Connect your GitHub account or import from URL.'
                  : 'No repositories match your search.'}
              </Text>
            </View>
          }
          contentContainerStyle={repos.length === 0 ? styles.listContainer : undefined}
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
    marginBottom: 10,
  },
  attemptsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
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
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  repoItem: {
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
  repoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
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
  repoFullName: {
    fontSize: 14,
    color: '#666',
  },
  analyzeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  repoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  repoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  repoLanguage: {
    fontSize: 12,
    color: '#666',
  },
  repoStars: {
    fontSize: 12,
    color: '#666',
  },
});
