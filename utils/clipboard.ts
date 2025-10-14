// Clipboard utilities for cross-platform copy functionality

import { Platform, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export const copyToClipboard = async (text: string, successMessage: string = 'Copied to clipboard!'): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      // Web platform - use navigator.clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          // Show a subtle notification
          alert(successMessage);
        }
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert(successMessage);
      }
    } else {
      // Native platform - use expo-clipboard
      await Clipboard.setStringAsync(text);
      Alert.alert('Success', successMessage);
    }
  } catch (error) {
    if (Platform.OS === 'web') {
      alert('Failed to copy to clipboard');
    } else {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  }
};

