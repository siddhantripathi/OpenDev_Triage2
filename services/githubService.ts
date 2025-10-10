import axios from 'axios';
import { GitHubRepo, RepoData } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

export class GitHubService {
  static async getUserRepos(accessToken: string): Promise<GitHubRepo[]> {
    try {
      const response = await axios.get(`${GITHUB_API_BASE}/user/repos`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: {
          sort: 'updated',
          per_page: 50,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching GitHub repos:', error);
      throw new Error('Failed to fetch repositories');
    }
  }

  static async getRepoContents(
    accessToken: string,
    owner: string,
    repo: string,
    path: string = ''
  ): Promise<any[]> {
    try {
      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error) {
      console.error('Error fetching repo contents:', error);
      throw new Error('Failed to fetch repository contents');
    }
  }

  static parseRepoUrl(url: string): { owner: string; name: string } | null {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /^([^\/]+)\/([^\/]+)$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          name: match[2],
        };
      }
    }

    return null;
  }

  static generateN8NWebhookPayload(repoData: RepoData): RepoData[] {
    return [repoData];
  }

  static async searchRepositories(
    accessToken: string,
    query: string,
    limit: number = 10
  ): Promise<GitHubRepo[]> {
    try {
      const response = await axios.get(`${GITHUB_API_BASE}/search/repositories`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: {
          q: query,
          sort: 'updated',
          order: 'desc',
          per_page: limit,
        },
      });
      return response.data.items;
    } catch (error) {
      console.error('Error searching repositories:', error);
      throw new Error('Failed to search repositories');
    }
  }
}
