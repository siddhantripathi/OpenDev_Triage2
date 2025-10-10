import axios from 'axios';
import { RepoData, AnalysisResult } from '../types';

export class N8NService {
  private static getWebhookUrl(): string {
    return process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL || '';
  }

  static async analyzeRepository(repoData: RepoData): Promise<AnalysisResult> {
    try {
      const webhookUrl = this.getWebhookUrl();
      if (!webhookUrl) {
        throw new Error('N8N webhook URL not configured');
      }

      const payload = [repoData];

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout for analysis
      });

      return response.data as AnalysisResult;
    } catch (error) {
      console.error('Error analyzing repository:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Analysis timeout - the repository might be too large or n8n is not responding');
        }
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded - please try again later');
        }
        if (error.response?.status >= 500) {
          throw new Error('n8n server error - please try again later');
        }
      }

      throw new Error('Failed to analyze repository');
    }
  }

  static parseAnalysisResult(analysisResult: AnalysisResult): { issues: string[]; prompt: string } {
    try {
      // The response should have the structure provided in the user story
      const text = analysisResult.content.parts[0]?.text;

      if (!text) {
        throw new Error('Invalid analysis response format');
      }

      // Parse the JSON string from the response
      const parsed = JSON.parse(text);

      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Invalid analysis data format');
      }

      const analysis = parsed[0];

      if (!analysis.issues || !Array.isArray(analysis.issues) || !analysis.prompt) {
        throw new Error('Analysis response missing required fields');
      }

      return {
        issues: analysis.issues,
        prompt: analysis.prompt,
      };
    } catch (error) {
      console.error('Error parsing analysis result:', error);
      throw new Error('Failed to parse analysis results');
    }
  }
}
