import MockAdapter from 'axios-mock-adapter';

import { apiClient } from '@/api/client';

export function createApiMock() {
  return new MockAdapter(apiClient, { onNoMatch: 'throwException' });
}
