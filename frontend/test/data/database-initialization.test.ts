import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

import { initializeDatabase } from '@/data/database/database';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => 'a'.repeat(64)), setItemAsync: jest.fn(async () => undefined) }));

function createDatabase(cipherVersion: string | null, databasePath = 'broaker.db') {
  return {
    databasePath,
    getFirstAsync: jest.fn(async () => cipherVersion ? { cipher_version: cipherVersion } : null),
    getAllAsync: jest.fn(async () => []),
    execAsync: jest.fn(async () => undefined),
  } as unknown as SQLiteDatabase & { getFirstAsync: jest.Mock; execAsync: jest.Mock };
}

describe('database encryption startup', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  it('allows an in-memory database when SQLCipher is not bundled', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const db = createDatabase(null, ':memory:');

    await expect(initializeDatabase(db)).resolves.toBeUndefined();
    expect(db.getFirstAsync).toHaveBeenCalledWith('PRAGMA cipher_version');
    expect(db.execAsync).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS properties'));
    expect(db.execAsync).not.toHaveBeenCalledWith(expect.stringContaining('PRAGMA key'));
  });

  it('rejects an unencrypted persistent database', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const db = createDatabase(null, 'broaker.db');

    await expect(initializeDatabase(db)).rejects.toThrow('Encrypted local storage is unavailable.');
    expect(db.execAsync).not.toHaveBeenCalled();
  });

  it('sets the database key and WAL mode when SQLCipher is available', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const db = createDatabase('4.5.5');

    await expect(initializeDatabase(db)).resolves.toBeUndefined();
    expect(db.execAsync).toHaveBeenCalledWith(`PRAGMA key = '${'a'.repeat(64)}'`);
    expect(db.execAsync).toHaveBeenCalledWith('PRAGMA journal_mode = WAL');
    expect(db.execAsync).toHaveBeenCalledWith('PRAGMA user_version = 2');
    expect(db.execAsync).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS property_assets'));
  });
});
