import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Share } from 'react-native';
import type MockAdapter from 'axios-mock-adapter';
import { createAndShareBusinessProfile } from '@/utils/profile-share';
import { createApiMock } from './mock-api';
import { accessTokenFixture } from '../fixtures/api';

describe('createAndShareBusinessProfile', () => {
  let mock: MockAdapter;
  const fixedNow = new Date('2026-11-06T08:00:00.000Z');

  beforeAll(() => { mock = createApiMock(); });
  beforeEach(() => {
    mock.reset();
    jest.useFakeTimers({ now: fixedNow });
  });
  afterAll(() => {
    jest.useRealTimers();
    mock.restore();
  });

  it('creates an all-properties profile link with the saved expiry default and shares it', async () => {
    let payload: Record<string, unknown> | undefined;
    mock.onGet('/profile/preferences').reply(200, { language: 'en', theme: 'light', default_expiration_days: 7 });
    mock.onPost('/profile/share-links').reply((request) => {
      payload = JSON.parse(request.data as string) as Record<string, unknown>;
      return [201, { public_url: 'https://api.example.test/public/profiles/token-123' }];
    });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });

    await expect(createAndShareBusinessProfile(accessTokenFixture, 'Vance Realty')).resolves.toBe('shared');

    expect(payload).toEqual({
      title: 'Vance Realty profile',
      include_profile: true,
      include_properties: true,
      visibility: 'unlisted',
      expires_at: '2026-11-13T23:59:59.000Z',
    });
    expect(payload).not.toHaveProperty('property_ids');
    expect(payload).not.toHaveProperty('property_disclosures');
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('token-123') });
    expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(mock.history.post[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
  });

  it('creates a link without expiry when no default is set', async () => {
    let payload: Record<string, unknown> | undefined;
    mock.onGet('/profile/preferences').reply(200, { language: 'en', theme: 'light', default_expiration_days: null });
    mock.onPost('/profile/share-links').reply((request) => {
      payload = JSON.parse(request.data as string) as Record<string, unknown>;
      return [201, { public_url: 'https://api.example.test/public/profiles/token-456' }];
    });
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });

    await createAndShareBusinessProfile(accessTokenFixture, 'Vance Realty');

    expect(payload?.expires_at).toBeNull();
  });
});
