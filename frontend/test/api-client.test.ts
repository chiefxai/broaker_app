import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import type MockAdapter from 'axios-mock-adapter';

import { apiClient } from '@/api/client';
import {
  accessTokenFixture,
  currentUserResponseFixture,
  presignUploadRequestFixture,
  presignUploadResponseFixture,
  serviceUnavailableFixture,
  unauthorizedResponseFixture,
} from './fixtures/api';
import { createApiMock } from './utils/mock-api';

describe('apiClient', () => {
  let mock: MockAdapter;

  beforeAll(() => {
    mock = createApiMock();
  });

  beforeEach(() => mock.reset());

  afterAll(() => {
    mock.restore();
  });

  it('returns the authenticated user using the contract route and access token', async () => {
    mock.onGet('/auth/me').reply(200, currentUserResponseFixture);

    const response = await apiClient.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessTokenFixture}` },
    });

    expect(response.data).toEqual(currentUserResponseFixture);
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
  });

  it('preserves the contract error body when Cognito authentication fails', async () => {
    mock.onGet('/auth/me').reply(401, unauthorizedResponseFixture);

    await expect(
      apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessTokenFixture}` },
      }),
    ).rejects.toMatchObject({
      response: {
        status: 401,
        data: unauthorizedResponseFixture,
      },
    });
  });

  it('uses the documented presigned upload request and response shapes', async () => {
    mock
      .onPost('/uploads/presign', presignUploadRequestFixture)
      .reply(200, presignUploadResponseFixture);

    const response = await apiClient.post('/uploads/presign', presignUploadRequestFixture, {
      headers: { Authorization: `Bearer ${accessTokenFixture}` },
    });

    expect(response.data).toEqual(presignUploadResponseFixture);
    expect(mock.history.post[0].data).toBe(JSON.stringify(presignUploadRequestFixture));
  });

  it('preserves the contract error body when upload service configuration is unavailable', async () => {
    mock.onPost('/uploads/presign').reply(503, serviceUnavailableFixture);

    await expect(
      apiClient.post('/uploads/presign', presignUploadRequestFixture, {
        headers: { Authorization: `Bearer ${accessTokenFixture}` },
      }),
    ).rejects.toMatchObject({
      response: {
        status: 503,
        data: serviceUnavailableFixture,
      },
    });
  });
});
