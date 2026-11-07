import { create } from 'axios';
import { Platform } from 'react-native';

// Set EXPO_PUBLIC_API_URL to the API origin plus `/api/v1` (not the origin root).
// Android emulators reach the host machine through 10.0.2.2 instead of localhost.
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const baseURL = Platform.OS === 'android'
  ? configuredBaseUrl.replace('://localhost', '://10.0.2.2').replace('://127.0.0.1', '://10.0.2.2')
  : configuredBaseUrl;

export const apiClient = create({
  baseURL,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});
