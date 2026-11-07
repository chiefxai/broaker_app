import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface StoredAuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

const SESSION_KEY = 'broaker.auth.session.v1';

export async function readAuthSession(): Promise<StoredAuthSession | null> {
  const value = Platform.OS === 'web'
    ? globalThis.sessionStorage?.getItem(SESSION_KEY) ?? null
    : await SecureStore.getItemAsync(SESSION_KEY);
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const session = parsed as Partial<StoredAuthSession>;
    if (typeof session.accessToken !== 'string' || typeof session.expiresAt !== 'number') return null;
    return {
      accessToken: session.accessToken,
      refreshToken: typeof session.refreshToken === 'string' ? session.refreshToken : undefined,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function writeAuthSession(session: StoredAuthSession): Promise<void> {
  const value = JSON.stringify(session);
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.setItem(SESSION_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearAuthSession(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
