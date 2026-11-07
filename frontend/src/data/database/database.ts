import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { isMockMode } from '@/data/app-mode';
import { mockProperties } from '@/data/mock/properties';
import { seedMockPropertiesIfNeeded } from './property-repository';

const DATABASE_KEY_NAME = 'broaker.sqlite.key.v1';

async function getDatabaseKey() {
  const existingKey = await SecureStore.getItemAsync(DATABASE_KEY_NAME);
  if (existingKey) {
    if (!/^[a-f0-9]{64}$/i.test(existingKey)) throw new Error('The local database key is invalid.');
    return existingKey;
  }

  const bytes = await Crypto.getRandomBytesAsync(32);
  const newKey = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(DATABASE_KEY_NAME, newKey);
  return newKey;
}

export async function initializeDatabase(db: SQLiteDatabase) {
  if (Platform.OS !== 'web') {
    const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    if (!cipher?.cipher_version) {
      // Expo Go ships SQLite without the app-configured SQLCipher build flag.
      // Expo Go does not include SQLCipher. Its database provider uses :memory:
      // so live API-backed screens can run without storing private records in
      // an unencrypted database file. Persistent live databases must use cipher.
      if (db.databasePath !== ':memory:') {
        throw new Error('Encrypted local storage is unavailable. Run live mode in an iOS or Android development build with SQLCipher enabled.');
      }
    } else {
      const key = await getDatabaseKey();
      // The key is generated locally and validated as hex before interpolation into this pragma.
      await db.execAsync(`PRAGMA key = '${key}'`);
      await db.execAsync('PRAGMA journal_mode = WAL');
    }
  }

  await db.execAsync('PRAGMA foreign_keys = ON');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_properties_updated_at ON properties(updated_at DESC);
    CREATE TABLE IF NOT EXISTS property_assets (
      id TEXT PRIMARY KEY NOT NULL,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      local_uri TEXT NOT NULL,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      category TEXT NOT NULL,
      display_name TEXT,
      visibility TEXT NOT NULL DEFAULT 'private',
      status TEXT NOT NULL DEFAULT 'pending',
      remote_document_id TEXT,
      sync_error TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_property_assets_pending ON property_assets(property_id, status, created_at);
  `);

  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(properties)');
  const existingColumns = new Set(columns.map((column) => column.name));
  for (const [name, definition] of [
    ['remote_id', 'TEXT'],
    ['owner_sub', 'TEXT'],
    ['sync_status', "TEXT NOT NULL DEFAULT 'synced'"],
    ['draft_json', 'TEXT'],
    ['draft_step', 'INTEGER NOT NULL DEFAULT 0'],
    ['sync_error', 'TEXT'],
  ] as const) {
    if (!existingColumns.has(name)) await db.execAsync(`ALTER TABLE properties ADD COLUMN ${name} ${definition}`);
  }
  await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_remote_id ON properties(remote_id) WHERE remote_id IS NOT NULL');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_properties_sync ON properties(owner_sub, sync_status, updated_at)');
  await db.execAsync('PRAGMA user_version = 2');
}

export async function initializeAppDatabase(db: SQLiteDatabase) {
  await initializeDatabase(db);
  if (isMockMode) await seedMockPropertiesIfNeeded(db, mockProperties);
}
