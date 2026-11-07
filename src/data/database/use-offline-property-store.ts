import { useSQLiteContext } from 'expo-sqlite';
import { useOptionalAuth } from '@/auth/auth-provider';
import { keepLocalAsset, removeLocalAssetFile } from './local-files';
import { addLocalPropertyAsset, deleteLocalPropertyAsset, getLocalProperty, listLocalPropertyAssets, saveLocalProperty, type LocalPropertyAsset } from './property-repository';
import { syncPendingLocalProperties } from './offline-sync';

export function useOfflinePropertyStore() {
  const db = useSQLiteContext();
  const auth = useOptionalAuth();
  return {
    saveProperty: (property: Parameters<typeof saveLocalProperty>[1]) => saveLocalProperty(db, property),
    getProperty: (id: string) => getLocalProperty(db, id),
    saveAsset: async (asset: Parameters<typeof addLocalPropertyAsset>[1]) => addLocalPropertyAsset(db, { ...asset, local_uri: await keepLocalAsset(asset.local_uri, asset.filename) }),
    listAssets: (propertyId: string) => listLocalPropertyAssets(db, propertyId),
    deleteAsset: async (id: string) => { const asset = await db.getFirstAsync<LocalPropertyAsset>('SELECT * FROM property_assets WHERE id = ?', id); if (asset) await removeLocalAssetFile(asset.local_uri); await deleteLocalPropertyAsset(db, id); },
    syncNow: () => auth?.accessToken && auth.currentUser?.sub ? syncPendingLocalProperties(db, auth.accessToken, auth.currentUser.sub) : Promise.resolve({ synced: 0, errors: [] }),
  };
}
