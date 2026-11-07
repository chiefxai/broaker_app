import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import type MockAdapter from 'axios-mock-adapter';

import { apiClient } from '@/api/client';
import { createAuthProvider } from '@/auth/providers/factory';
import { createApiMock } from '../utils/mock-api';

describe('auth provider abstraction', () => {
  let apiMock: MockAdapter;
  beforeAll(() => { apiMock = createApiMock(); });
  beforeEach(() => { apiMock.reset(); });
  afterAll(() => { apiMock.restore(); });

  it('defaults to the cross-platform password adapter', () => {
    expect(createAuthProvider()).toBe(createAuthProvider('password'));
  });

  it('normalizes email and maps login tokens from the API', async () => {
    apiMock.onPost('/auth/login').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ email: 'broker@example.test', password: 'secret' });
      return [200, { access_token: 'access-fixture', token_type: 'bearer', expires_in: 600 }];
    });
    await expect(createAuthProvider().signIn(' Broker@Example.Test ', 'secret'))
      .resolves.toEqual({ accessToken: 'access-fixture', expiresIn: 600 });
  });

  it('maps signup fields to the backend contract and returns a session token', async () => {
    apiMock.onPost('/auth/register').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        full_name: 'Asha Nair', email: 'asha@example.test', phone_number: '+919876543210', password: 'long-password',
      });
      return [201, { access_token: 'signup-token', token_type: 'bearer', expires_in: 600 }];
    });
    await expect(createAuthProvider().signUp({
      fullName: ' Asha Nair ', email: 'ASHA@example.test', phoneNumber: ' +919876543210 ', password: 'long-password',
    })).resolves.toEqual({ accessToken: 'signup-token', expiresIn: 600 });
  });

  it('rejects malformed API token responses', async () => {
    apiMock.onPost('/auth/login').reply(200, { access_token: null, expires_in: 'later' });
    await expect(createAuthProvider().signIn('a@example.test', 'pw')).rejects.toThrow(/invalid authentication response/i);
  });

  it('uses the shared API client', () => { expect(apiClient.defaults.timeout).toBeGreaterThan(0); });
});
