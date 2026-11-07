import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalProperty, saveLocalProperty } from './property-repository.web';
import type { LocalPropertyAsset } from './property-repository';
import type { LocalProperty } from '@/data/mock/properties';

const ASSETS_KEY = '@broaker/web-property-assets/v1';

async function readAssets(): Promise<LocalPropertyAsset[]> {
  const value = await AsyncStorage.getItem(ASSETS_KEY);
  return value ? JSON.parse(value) as LocalPropertyAsset[] : [];
}

export function useOfflinePropertyStore() {
  return {
    saveProperty: (property: LocalProperty) => saveLocalProperty(property),
    getProperty: (id: string) => getLocalProperty(id),
    saveAsset: async (asset: Omit<LocalPropertyAsset, 'created_at' | 'status' | 'remote_document_id' | 'sync_error'>) => {
      const assets = await readAssets();
      assets.push({ ...asset, created_at: new Date().toISOString(), status: 'pending', remote_document_id: null, sync_error: null });
      await AsyncStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
    },
    listAssets: async (propertyId: string) => (await readAssets()).filter((asset) => asset.property_id === propertyId),
    deleteAsset: async (id: string) => { await AsyncStorage.setItem(ASSETS_KEY, JSON.stringify((await readAssets()).filter((asset) => asset.id !== id))); },
    syncNow: async () => ({ synced: 0, errors: [] as { id: string; message: string }[] }),
  };
}
