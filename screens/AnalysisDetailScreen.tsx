import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { UserAnalysis } from '../types';

type AnalysisDetailRouteProp = RouteProp<
  { AnalysisDetail: { analysis: UserAnalysis } },
  'AnalysisDetail'
>;

export default function AnalysisDetailScreen() {
  const route = useRoute<AnalysisDetailRouteProp>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { analysis } = route.params;

  const openGitHubRepo = () => {
    const url = `https://github.com/${analysis.repoData.repo_owner}/${analysis.repoData.repo_name}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Repository Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Repository Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="folder" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Repository</Text>
                <Text style={styles.infoValue}>{analysis.repoData.repo_name}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Owner</Text>
                <Text style={styles.infoValue}>{analysis.repoData.repo_owner}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="git-branch" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Branch</Text>
                <Text style={styles.infoValue}>{analysis.repoData.branch}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Analyzed On</Text>
                <Text style={styles.infoValue}>
                  {new Date(analysis.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.githubButton} onPress={openGitHubRepo}>
              <Ionicons name="logo-github" size={20} color="#fff" />
              <Text style={styles.githubButtonText}>View on GitHub</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Issues Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Issues Found ({analysis.analysisResult.issues.length})
          </Text>
          <View style={styles.issuesCard}>
            {analysis.analysisResult.issues.length === 0 ? (
              <View style={styles.noIssues}>
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                <Text style={styles.noIssuesText}>No issues found!</Text>
              </View>
            ) : (
              analysis.analysisResult.issues.map((issue, index) => (
                <View key={index} style={styles.issueItem}>
                  <View style={styles.issueHeader}>
                    <Ionicons name="alert-circle" size={20} color="#ff6b6b" />
                    <Text style={styles.issueNumber}>Issue #{index + 1}</Text>
                  </View>
                  <Text style={styles.issueText}>{issue}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Suggested Fixes Section */}
        {analysis.analysisResult.prompt && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested Fixes</Text>
            <View style={styles.promptCard}>
              <Ionicons name="bulb" size={24} color="#FFA000" style={styles.promptIcon} />
              <Text style={styles.promptText}>{analysis.analysisResult.prompt}</Text>
            </View>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  githubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 10,
    gap: 8,
  },
  githubButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  issuesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noIssues: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noIssuesText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 10,
  },
  issueItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  issueNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff6b6b',
  },
  issueText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    paddingLeft: 28,
  },
  promptCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
  },
  promptIcon: {
    marginBottom: 10,
  },
  promptText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
});

