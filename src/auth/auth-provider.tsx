import { isAxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { apiClient } from '@/api/client';
import { isMockMode } from '@/data/app-mode';
import { clearAuthSession, readAuthSession, writeAuthSession, type StoredAuthSession } from './session-storage';
import { authProvider, authProviderKind } from './providers/factory';
import type { SignUpInput } from './providers/types';
import { formatAuthRequestError, formatAuthValidationErrors } from './auth-errors';

export interface CurrentUser {
  sub: string;
  username?: string | null;
  scope: string;
}

interface AuthContextValue {
  accessToken: string | null;
  currentUser: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isReady: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  clearError: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(tokens: { accessToken: string; refreshToken?: string; expiresIn: number }): StoredAuthSession {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + Math.max(0, tokens.expiresIn) * 1000,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(!isMockMode);
  const [isReady, setIsReady] = useState(isMockMode);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const applySession = useCallback((session: StoredAuthSession) => {
    setAccessToken(session.accessToken);
  }, []);

  const signOut = useCallback(async () => {
    await clearAuthSession();
    setAccessToken(null);
    setCurrentUser(null);
    setError(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    mounted.current = true;
    if (isMockMode) return () => { mounted.current = false; };
    (async () => {
      try {
        const saved = await readAuthSession();
        if (!saved) return;
        if (saved.expiresAt > Date.now() + 30_000) {
          if (mounted.current) applySession(saved);
        } else {
          await clearAuthSession();
        }
      } catch {
        await clearAuthSession().catch(() => undefined);
      } finally {
        if (mounted.current) {
          setIsLoading(false);
          setIsReady(true);
        }
      }
    })();
    return () => { mounted.current = false; };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const tokens = await authProvider.signIn(email, password);
      const session = toSession(tokens);
      await writeAuthSession(session);
      applySession(session);
      setIsReady(true);
    } catch (reason) {
      const message = isAxiosError(reason)
        ? (typeof reason.response?.data?.detail === 'string' ? reason.response.data.detail : formatAuthValidationErrors(reason.response?.data?.detail, formatAuthRequestError(reason, 'Could not complete sign-in. Please try again.')))
        : reason instanceof Error ? reason.message : 'Could not complete sign-in. Please try again.';
      setError(message);
      throw reason;
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  const signUp = useCallback(async (input: SignUpInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const tokens = await authProvider.signUp(input);
      const session = toSession(tokens);
      await writeAuthSession(session);
      applySession(session);
      setIsReady(true);
    } catch (reason) {
      const message = isAxiosError(reason)
        ? (typeof reason.response?.data?.detail === 'string' ? reason.response.data.detail : formatAuthValidationErrors(reason.response?.data?.detail, formatAuthRequestError(reason, 'Could not create your account right now.')))
        : reason instanceof Error ? reason.message : 'Could not create your account right now.';
      setError(message);
      throw reason;
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    apiClient.get<CurrentUser>('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(({ data }) => { if (active) setCurrentUser(data); })
      .catch((reason: unknown) => {
        if (!active) return;
        if (isAxiosError(reason) && reason.response?.status === 401) void signOut();
        else setError('Signed in, but the API identity check failed. Check that the API is running and reachable.');
      });
    return () => { active = false; };
  }, [accessToken, signOut]);

  const clearError = useCallback(() => setError(null), []);
  const value = useMemo<AuthContextValue>(() => ({
    accessToken,
    currentUser,
    isLoading,
    isAuthenticated: Boolean(accessToken),
    isReady,
    error,
    signIn,
    signUp,
    clearError,
    signOut,
  }), [accessToken, clearError, currentUser, error, isLoading, isReady, signIn, signOut, signUp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}

export function useAuth() {
  const context = useOptionalAuth();
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export { authProviderKind };
