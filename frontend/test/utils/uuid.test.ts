import { describe, expect, it, jest } from '@jest/globals';
import { createUuid } from '@/utils/uuid';

jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(() => new Uint8Array(16).fill(0xff)),
}));

describe('createUuid', () => {
  it('formats random bytes as an RFC 4122 version 4 UUID', () => {
    const uuid = createUuid();

    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
