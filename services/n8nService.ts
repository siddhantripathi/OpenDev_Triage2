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
        timeout: 90000, // 90 seconds timeout for long analysis
      });

      return response.data as AnalysisResult;
    } catch (error) {

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Analysis timeout (>90s). Repository might be too large.');
        }
        if (error.code === 'ERR_NETWORK') {
          throw new Error('Cannot connect to analysis service. Please try again later.');
        }
        if (error.response?.status === 404) {
          throw new Error('n8n webhook not found. Check workflow is active.');
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
      // The response is an array with one object
      const firstResult = Array.isArray(analysisResult) ? analysisResult[0] : analysisResult;
      const text = firstResult?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Invalid analysis response format');
      }

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
      throw new Error('Failed to parse analysis results');
    }
  }
}
