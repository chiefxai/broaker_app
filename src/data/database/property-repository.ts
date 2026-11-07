import type { SQLiteDatabase } from 'expo-sqlite';

import type { LocalProperty } from '@/data/mock/properties';

const MOCK_SEED_VERSION = 'mock-properties-v1';

interface PropertyRow {
  id: string;
  payload_json: string;
  created_at: string;
  updated_at: string;
  remote_id?: string | null;
  owner_sub?: string | null;
  sync_status?: 'synced' | 'pending' | 'syncing' | 'error';
  draft_json?: string | null;
  draft_step?: number;
  sync_error?: string | null;
}

function parsePropertyRow(row: PropertyRow): LocalProperty {
  const property = JSON.parse(row.payload_json) as LocalProperty;
  if (!property || property.id !== row.id || typeof property.title !== 'string') {
    throw new Error(`Saved property data is invalid (${row.id}).`);
  }
  return {
    ...property,
    remoteId: row.remote_id ?? property.remoteId ?? null,
    ownerSub: row.owner_sub ?? property.ownerSub ?? null,
    syncStatus: row.sync_status ?? property.syncStatus ?? 'synced',
    ...(row.draft_json ? { offlineDraft: JSON.parse(row.draft_json) as Record<string, unknown> } : {}),
    ...(row.draft_step ? { offlineStep: row.draft_step } : {}),
    ...(row.sync_error ? { syncError: row.sync_error } : {}),
  };
}

export async function listLocalProperties(db: SQLiteDatabase): Promise<LocalProperty[]> {
  const rows = await db.getAllAsync<PropertyRow>(
    'SELECT * FROM properties ORDER BY updated_at DESC, id ASC',
  );
  return rows.map(parsePropertyRow);
}

export async function getLocalProperty(db: SQLiteDatabase, id: string): Promise<LocalProperty | null> {
  const row = await db.getFirstAsync<PropertyRow>(
    'SELECT * FROM properties WHERE id = ? OR remote_id = ? ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END LIMIT 1',
    id,
    id,
    id,
  );
  return row ? parsePropertyRow(row) : null;
}

export async function saveLocalProperty(db: SQLiteDatabase, property: LocalProperty): Promise<void> {
  const now = new Date().toISOString();
  const { offlineDraft, offlineStep, syncError, ...payload } = property as LocalProperty & { offlineDraft?: unknown; offlineStep?: number; syncError?: string };
  await db.runAsync(
    `INSERT INTO properties (id, payload_json, created_at, updated_at, remote_id, owner_sub, sync_status, draft_json, draft_step, sync_error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at,
       remote_id = COALESCE(excluded.remote_id, properties.remote_id), owner_sub = COALESCE(excluded.owner_sub, properties.owner_sub),
       sync_status = CASE WHEN excluded.sync_status != 'synced' THEN excluded.sync_status ELSE properties.sync_status END,
       draft_json = COALESCE(excluded.draft_json, properties.draft_json),
       draft_step = MAX(excluded.draft_step, properties.draft_step), sync_error = COALESCE(excluded.sync_error, properties.sync_error)`,
    property.id,
    JSON.stringify(payload),
    now,
    now,
    property.remoteId ?? null,
    property.ownerSub ?? null,
    property.syncStatus ?? 'synced',
    offlineDraft ? JSON.stringify(offlineDraft) : null,
    offlineStep ?? 0,
    syncError ?? null,
  );
}

export interface LocalPropertyAsset {
  id: string;
  property_id: string;
  local_uri: string;
  filename: string;
  content_type: string;
  category: string;
  display_name: string | null;
  visibility: 'private' | 'shared' | 'public';
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  remote_document_id: string | null;
  sync_error: string | null;
  created_at: string;
}

export async function listPendingLocalProperties(db: SQLiteDatabase, ownerSub: string): Promise<LocalProperty[]> {
  const rows = await db.getAllAsync<PropertyRow>("SELECT * FROM properties WHERE (owner_sub = ? OR owner_sub IS NULL) AND sync_status IN ('pending', 'syncing', 'error') ORDER BY updated_at ASC", ownerSub);
  return rows.map(parsePropertyRow);
}

export async function updateLocalPropertySync(db: SQLiteDatabase, id: string, values: { remoteId?: string; status: 'synced' | 'pending' | 'syncing' | 'error'; error?: string | null; ownerSub?: string }): Promise<void> {
  await db.runAsync(
    'UPDATE properties SET remote_id = COALESCE(?, remote_id), owner_sub = COALESCE(?, owner_sub), sync_status = ?, sync_error = ?, updated_at = ? WHERE id = ? OR remote_id = ?',
    values.remoteId ?? null, values.ownerSub ?? null, values.status, values.error ?? null, new Date().toISOString(), id, id,
  );
}

export async function updateLocalPropertyPublished(db: SQLiteDatabase, id: string, published = true): Promise<void> {
  const property = await getLocalProperty(db, id);
  if (!property) return;
  await saveLocalProperty(db, published
    ? { ...property, status: { label: 'Available', tone: 'success' }, footerLabel: 'Published' }
    : { ...property, footerLabel: 'Synced' });
}

export async function saveLocalPropertyAsset(db: SQLiteDatabase, asset: Omit<LocalPropertyAsset, 'created_at' | 'status' | 'remote_document_id' | 'sync_error'>): Promise<void> {
  await db.runAsync(
    `INSERT INTO property_assets (id, property_id, local_uri, filename, content_type, category, display_name, visibility, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET local_uri = excluded.local_uri, filename = excluded.filename, display_name = excluded.display_name, visibility = excluded.visibility`,
    asset.id, asset.property_id, asset.local_uri, asset.filename, asset.content_type, asset.category, asset.display_name, asset.visibility, new Date().toISOString(),
  );
}

export async function addLocalPropertyAsset(db: SQLiteDatabase, asset: Pick<LocalPropertyAsset, 'id' | 'property_id' | 'local_uri' | 'filename' | 'content_type' | 'category' | 'display_name' | 'visibility'>): Promise<void> {
  await db.runAsync(
    `INSERT INTO property_assets (id, property_id, local_uri, filename, content_type, category, display_name, visibility, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
     ON CONFLICT(id) DO NOTHING`,
    asset.id, asset.property_id, asset.local_uri, asset.filename, asset.content_type, asset.category, asset.display_name, asset.visibility, new Date().toISOString(),
  );
}

export async function listLocalPropertyAssets(db: SQLiteDatabase, propertyId: string): Promise<LocalPropertyAsset[]> {
  return db.getAllAsync<LocalPropertyAsset>('SELECT * FROM property_assets WHERE property_id = ? ORDER BY created_at ASC', propertyId);
}

export async function updateLocalPropertyAsset(db: SQLiteDatabase, id: string, values: Pick<LocalPropertyAsset, 'status'> & Partial<Pick<LocalPropertyAsset, 'remote_document_id' | 'sync_error'>>): Promise<void> {
  await db.runAsync('UPDATE property_assets SET status = ?, remote_document_id = COALESCE(?, remote_document_id), sync_error = ? WHERE id = ?', values.status, values.remote_document_id ?? null, values.sync_error ?? null, id);
}

export async function deleteLocalPropertyAsset(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM property_assets WHERE id = ?', id);
}

export async function deleteLocalProperty(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM properties WHERE id = ?', id);
}

export async function seedMockPropertiesIfNeeded(db: SQLiteDatabase, properties: LocalProperty[]): Promise<boolean> {
  const seeded = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_metadata WHERE key = ?',
    MOCK_SEED_VERSION,
  );
  if (seeded) return false;

  await db.withTransactionAsync(async () => {
    const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM properties');
    if ((count?.count ?? 0) === 0) {
      for (const property of properties) await saveLocalProperty(db, property);
    }
    await db.runAsync(
      'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
      MOCK_SEED_VERSION,
      new Date().toISOString(),
    );
  });
  return true;
}
