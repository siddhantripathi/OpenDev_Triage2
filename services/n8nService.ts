import axios from 'axios';
import { RepoData, AnalysisResult } from '../types';

export class N8NService {
  private static getWebhookUrl(): string {
    return process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL || '';
  }

  static async analyzeRepository(repoData: RepoData): Promise<AnalysisResult> {
    try {
      const webhookUrl = this.getWebhookUrl();
      console.log('[n8n] Starting analysis for:', repoData.repo_name);
      console.log('[n8n] Webhook URL:', webhookUrl);
      
      if (!webhookUrl) {
        throw new Error('N8N webhook URL not configured');
      }

      const payload = [repoData];
      const startTime = Date.now();

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 90000, // 90 seconds timeout for long analysis
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[n8n] Analysis completed in ${duration}s`);
      console.log('[n8n] Response:', JSON.stringify(response.data).substring(0, 200));

      return response.data as AnalysisResult;
    } catch (error) {
      console.error('[n8n] Error:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Analysis timeout (>90s). Repository might be too large.');
        }
        if (error.code === 'ERR_NETWORK') {
          throw new Error('Cannot connect to n8n. Is it running at localhost:5678?');
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
      console.log('[n8n] Parsing analysis result');
      
      // The response is an array with one object
      const firstResult = Array.isArray(analysisResult) ? analysisResult[0] : analysisResult;
      const text = firstResult?.content?.parts?.[0]?.text;

      if (!text) {
        console.error('[n8n] Invalid response structure:', JSON.stringify(analysisResult));
        throw new Error('Invalid analysis response format');
      }

      console.log('[n8n] Parsing JSON from text field');
      const parsed = JSON.parse(text);

      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Invalid analysis data format');
      }

      const analysis = parsed[0];

      if (!analysis.issues || !Array.isArray(analysis.issues) || !analysis.prompt) {
        throw new Error('Analysis response missing required fields');
      }

      console.log('[n8n] Found', analysis.issues.length, 'issues');
      return {
        issues: analysis.issues,
        prompt: analysis.prompt,
      };
    } catch (error) {
      console.error('[n8n] Parse error:', error);
      throw new Error('Failed to parse analysis results');
    }
  }
}
