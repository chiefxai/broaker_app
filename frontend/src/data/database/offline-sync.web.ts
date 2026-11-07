import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocalProperty } from '@/data/mock/properties';
import type { LocalPropertyAsset } from './property-repository';
import { getLocalProperty, listLocalProperties, saveLocalProperty } from './property-repository.web';
import { syncPendingProperties } from './offline-sync.shared';

const ASSETS_KEY = '@broaker/web-property-assets/v1';

async function readAssets(): Promise<LocalPropertyAsset[]> {
  const value = await AsyncStorage.getItem(ASSETS_KEY);
  return value ? JSON.parse(value) as LocalPropertyAsset[] : [];
}

export async function syncPendingWebProperties(accessToken: string, ownerSub: string) {
  return syncPendingProperties({
    listPending: async (subject) => (await listLocalProperties()).filter((property) =>
      (property.ownerSub == null || property.ownerSub === subject)
      && (property.syncStatus === 'pending' || property.syncStatus === 'syncing' || property.syncStatus === 'error')),
    listAssets: async (propertyId) => (await readAssets()).filter((asset) => asset.property_id === propertyId),
    updateAsset: async (assetId, values) => {
      const assets = await readAssets();
      await AsyncStorage.setItem(ASSETS_KEY, JSON.stringify(assets.map((asset) => asset.id === assetId ? { ...asset, ...values } : asset)));
    },
    updateSync: async (propertyId, values) => {
      const property = await getLocalProperty(propertyId);
      if (!property) return;
      await saveLocalProperty({
        ...property,
        ...(values.remoteId ? { remoteId: values.remoteId } : {}),
        ...(values.ownerSub ? { ownerSub: values.ownerSub } : {}),
        syncStatus: values.status,
        syncError: values.error ?? undefined,
      });
    },
    updatePublished: async (propertyId, published = true) => {
      const property = await getLocalProperty(propertyId);
      if (!property) return;
      await saveLocalProperty(published
        ? { ...property, status: { label: 'Available', tone: 'success' }, footerLabel: 'Published' }
        : { ...property, footerLabel: 'Synced' });
    },
  }, accessToken, ownerSub);
}
