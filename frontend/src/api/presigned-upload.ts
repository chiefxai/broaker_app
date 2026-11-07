import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';

export const PRESIGNED_UPLOAD_TIMEOUT_MS = 60_000;

export async function uploadRawFileToPresignedUrl(uploadUrl: string, contentType: string, file: Blob): Promise<void> {
  // React Native's global fetch does not reliably accept file-system Blob bodies.
  // Expo's fetch implementation streams Expo File/Blob objects on native.
  const request = Platform.OS === 'web' ? fetch : expoFetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PRESIGNED_UPLOAD_TIMEOUT_MS);
  try {
    const response = await request(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`File upload failed (${response.status}).`);
  } catch (reason) {
    if (controller.signal.aborted) throw new Error('File upload timed out. Check the storage connection and try again.');
    if (reason instanceof TypeError) throw new Error('Could not reach file storage. Check the storage address and try again.');
    throw reason;
  } finally {
    clearTimeout(timeout);
  }
}
