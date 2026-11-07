import { describe, expect, it } from '@jest/globals';
import { getApiErrorMessage, isUuid } from '@/api/errors';

describe('API error details', () => {
  it('shows FastAPI validation details instead of Axios status text', () => {
    const error = Object.assign(new Error('Request failed with status code 422'), {
      isAxiosError: true,
      response: { data: { detail: [{ loc: ['body', 'expires_at'], msg: 'must be in the future' }] } },
    });
    expect(getApiErrorMessage(error, 'Request failed.')).toBe('body.expires_at: must be in the future');
  });

  it('accepts UUID property identifiers and rejects local placeholder IDs', () => {
    expect(isUuid('d4c4ab58-3095-4d08-b2f7-534488ab89b0')).toBe(true);
    expect(isUuid('local-property-1')).toBe(false);
  });
});
