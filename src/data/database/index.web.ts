export async function initializeAppDatabase(): Promise<void> {
  // Browser storage is managed by the web repository; SQLite's OPFS database
  // cannot be opened exclusively by multiple tabs at the same time.
}

export async function initializeDatabase(): Promise<void> {
  // Kept for parity with the native database module.
}

export {
  deleteLocalProperty,
  getLocalProperty,
  listLocalProperties,
  saveLocalProperty,
  seedMockPropertiesIfNeeded,
} from './property-repository.web';
export { localPropertyKeys, useLocalProperties, useLocalProperty } from './use-local-properties.web';
// Pin the web implementation explicitly: the shared base hook calls
// useSQLiteContext, which is only available under SQLiteProvider on native.
export { useDeleteProperty } from './use-delete-property.web';
export { useSaveLocalProperty } from './use-save-local-property.web';
export { useOfflinePropertyStore } from './use-offline-property-store.web';
