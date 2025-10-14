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
        timeout: 180000, // 3 minutes timeout for long analysis
      });

      // Validate response structure
      if (!response.data) {
        throw new Error('Empty response from analysis service');
      }

      if (!Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('Invalid response format - expected non-empty array');
      }

      const firstResult = response.data[0];
      
      if (!firstResult.candidates || !Array.isArray(firstResult.candidates) || firstResult.candidates.length === 0) {
        throw new Error('Invalid response structure - missing candidates array');
      }

      return response.data[0] as AnalysisResult;
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
        if (error.response && error.response.status >= 500) {
          throw new Error('n8n server error - please try again later');
        }
      }

      throw new Error(`Failed to analyze repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static parseAnalysisResult(analysisResult: AnalysisResult): { issues: string[]; prompt: string } {
    try {
      // Handle the candidates array wrapper
      const candidate = analysisResult?.candidates?.[0];
      if (!candidate) {
        throw new Error('No candidates found in analysis response');
      }
      
      const text = candidate?.content?.parts?.[0]?.text;
  
      if (!text) {
        throw new Error('No text content found in analysis response');
      }
  
      // Strip markdown code block formatting
      let cleanText = text;
      if (cleanText.startsWith('```json\n')) {
        cleanText = cleanText.substring(8); // Remove '```json\n'
      }
      if (cleanText.endsWith('\n```')) {
        cleanText = cleanText.substring(0, cleanText.length - 4); // Remove '\n```'
      } else if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3); // Remove '```'
      }
      
      // Trim any extra whitespace
      cleanText = cleanText.trim();
  
      const parsed = JSON.parse(cleanText);
  
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Invalid analysis data format - expected array with analysis object');
      }
  
      const analysis = parsed[0];
  
      if (!analysis.issues || !Array.isArray(analysis.issues) || !analysis.prompt) {
        throw new Error('Analysis response missing required fields: issues array and prompt string');
      }
  
      return {
        issues: analysis.issues,
        prompt: analysis.prompt,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse JSON from analysis response - invalid JSON format');
      }
      throw new Error(`Failed to parse analysis results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}