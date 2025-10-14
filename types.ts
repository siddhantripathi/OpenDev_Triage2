export interface RepoData {
  repo_owner: string;
  branch: string;
  repo_name: string;
}

export interface AnalysisIssue {
  issues: string[];
  prompt: string;
}

export interface AnalysisResult {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role?: string;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata?: any;
  modelVersion?: string;
  responseId?: string;
}

export interface UserAnalysis {
  id: string;
  userId: string;
  repoData: RepoData;
  analysisResult: AnalysisIssue;
  createdAt: Date;
  attempts: number;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  githubToken?: string;
  attemptsLeft: number;
  createdAt: Date;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
}
