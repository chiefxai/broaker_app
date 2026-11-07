import type { SQLiteDatabase } from 'expo-sqlite';
import {
  listLocalPropertyAssets, listPendingLocalProperties, updateLocalPropertyAsset,
  updateLocalPropertyPublished, updateLocalPropertySync,
} from './property-repository';
import { syncPendingProperties } from './offline-sync.shared';

type SyncProgress = (propertyId: string, status: 'syncing' | 'synced' | 'error', message?: string) => void;

export async function syncPendingLocalProperties(db: SQLiteDatabase, accessToken: string, ownerSub: string, onProgress?: SyncProgress) {
  return syncPendingProperties({
    listPending: (subject) => listPendingLocalProperties(db, subject),
    listAssets: (propertyId) => listLocalPropertyAssets(db, propertyId),
    updateAsset: (assetId, values) => updateLocalPropertyAsset(db, assetId, values),
    updateSync: (propertyId, values) => updateLocalPropertySync(db, propertyId, values),
    updatePublished: (propertyId, published) => updateLocalPropertyPublished(db, propertyId, published),
  }, accessToken, ownerSub, onProgress);
}
