import React, { useState } from 'react';
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
import { copyToClipboard } from '../utils/clipboard';
import { getRelativeTime, formatDateTime } from '../utils/dateUtils';

type AnalysisDetailRouteProp = RouteProp<
  { AnalysisDetail: { analysis: UserAnalysis } },
  'AnalysisDetail'
>;

export default function AnalysisDetailScreen() {
  const route = useRoute<AnalysisDetailRouteProp>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { analysis } = route.params;
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const openGitHubRepo = () => {
    const url = `https://github.com/${analysis.repoData.repo_owner}/${analysis.repoData.repo_name}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const copyIssue = async (issue: string, index: number) => {
    await copyToClipboard(issue, `Issue #${index + 1} copied!`);
  };

  const copyAllIssues = async () => {
    const allIssues = analysis.analysisResult.issues
      .map((issue, index) => `Issue #${index + 1}:\n${issue}`)
      .join('\n\n');
    await copyToClipboard(allIssues, 'All issues copied!');
  };

  const copyPrompt = async () => {
    await copyToClipboard(analysis.analysisResult.prompt, 'Suggested fixes copied!');
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
                <Text style={styles.infoLabel}>Analyzed</Text>
                <Text style={styles.infoValue}>
                  {getRelativeTime(new Date(analysis.createdAt))}
                </Text>
                <Text style={styles.infoSubtext}>
                  {formatDateTime(new Date(analysis.createdAt))}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[
                styles.githubButton,
                Platform.OS === 'web' && hoveredButton === 'github' && styles.githubButtonHover
              ]}
              onPress={openGitHubRepo}
              {...(Platform.OS === 'web' ? {
                onMouseEnter: () => setHoveredButton('github'),
                onMouseLeave: () => setHoveredButton(null),
              } : {})}
            >
              <Ionicons name="logo-github" size={20} color="#fff" />
              <Text style={styles.githubButtonText}>View on GitHub</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Issues Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Issues Found ({analysis.analysisResult.issues.length})
            </Text>
            {analysis.analysisResult.issues.length > 0 && (
              <TouchableOpacity 
                style={[
                  styles.copyAllButton,
                  Platform.OS === 'web' && hoveredButton === 'copyAll' && styles.copyAllButtonHover
                ]}
                onPress={copyAllIssues}
                {...(Platform.OS === 'web' ? {
                  onMouseEnter: () => setHoveredButton('copyAll'),
                  onMouseLeave: () => setHoveredButton(null),
                } : {})}
              >
                <Ionicons name="copy-outline" size={16} color="#007AFF" />
                <Text style={styles.copyAllText}>Copy All</Text>
              </TouchableOpacity>
            )}
          </View>
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
                    <View style={styles.issueHeaderLeft}>
                      <Ionicons name="alert-circle" size={20} color="#ff6b6b" />
                      <Text style={styles.issueNumber}>Issue #{index + 1}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[
                        styles.copyButton,
                        Platform.OS === 'web' && hoveredButton === `issue-${index}` && styles.copyButtonHover
                      ]}
                      onPress={() => copyIssue(issue, index)}
                      {...(Platform.OS === 'web' ? {
                        onMouseEnter: () => setHoveredButton(`issue-${index}`),
                        onMouseLeave: () => setHoveredButton(null),
                      } : {})}
                    >
                      <Ionicons name="copy-outline" size={16} color="#666" />
                    </TouchableOpacity>
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Suggested Fixes</Text>
              <TouchableOpacity 
                style={[
                  styles.copyPromptButton,
                  Platform.OS === 'web' && hoveredButton === 'prompt' && styles.copyPromptButtonHover
                ]}
                onPress={copyPrompt}
                {...(Platform.OS === 'web' ? {
                  onMouseEnter: () => setHoveredButton('prompt'),
                  onMouseLeave: () => setHoveredButton(null),
                } : {})}
              >
                <Ionicons name="copy-outline" size={16} color="#FFA000" />
                <Text style={styles.copyPromptText}>Copy</Text>
              </TouchableOpacity>
            </View>
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
  infoSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
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
  githubButtonHover: {
    backgroundColor: '#000',
    transform: [{ scale: 1.02 }],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  copyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  copyAllButtonHover: {
    backgroundColor: '#BBDEFB',
  },
  copyAllText: {
    fontSize: 14,
    color: '#007AFF',
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
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  issueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  copyButtonHover: {
    backgroundColor: '#e0e0e0',
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
  copyPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  copyPromptButtonHover: {
    backgroundColor: '#FFE082',
  },
  copyPromptText: {
    fontSize: 14,
    color: '#FFA000',
    fontWeight: '600',
  },
});

