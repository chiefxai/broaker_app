import { apiClient } from '@/api/client';
import type { AuthProviderAdapter, AuthTokens, SignUpInput } from './types';

interface ApiTokens { access_token: string; expires_in: number; token_type: string }

function normalizeTokens(value: ApiTokens): AuthTokens {
  if (!value || typeof value.access_token !== 'string' || typeof value.expires_in !== 'number') {
    throw new Error('The API returned an invalid authentication response.');
  }
  return { accessToken: value.access_token, expiresIn: value.expires_in };
}

export const passwordAuthProvider: AuthProviderAdapter = {
  async signIn(email, password) {
    const { data } = await apiClient.post<ApiTokens>('/auth/login', { email: email.trim().toLowerCase(), password });
    return normalizeTokens(data);
  },
  async signUp(input: SignUpInput) {
    const { data } = await apiClient.post<ApiTokens>('/auth/register', {
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone_number: input.phoneNumber.trim(),
      password: input.password,
    });
    return normalizeTokens(data);
  },
};
