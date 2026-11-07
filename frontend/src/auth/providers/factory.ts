import { passwordAuthProvider } from './password-provider';
import type { AuthProviderAdapter } from './types';

export type AuthProviderKind = 'password';

export const authProviderKind: AuthProviderKind = (process.env.EXPO_PUBLIC_AUTH_PROVIDER ?? 'password').toLowerCase() as AuthProviderKind;

export function createAuthProvider(kind: AuthProviderKind = authProviderKind): AuthProviderAdapter {
  if (kind === 'password') return passwordAuthProvider;
  throw new Error(`Unsupported authentication provider: ${kind}`);
}

export const authProvider = createAuthProvider();
