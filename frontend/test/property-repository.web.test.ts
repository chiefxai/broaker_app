import AsyncStorage from '@react-native-async-storage/async-storage';

import { mockProperties } from '@/data/mock/properties';
import {
  deleteLocalProperty,
  getLocalProperty,
  listLocalProperties,
  saveLocalProperty,
  seedMockPropertiesIfNeeded,
} from '@/data/database/property-repository.web';

describe('web local property repository', () => {
  it('seeds mock properties on first load and reuses persisted records', async () => {
    await expect(listLocalProperties()).resolves.toEqual(mockProperties);
    await AsyncStorage.setItem('@broaker/web-properties/v1', JSON.stringify([mockProperties[1]]));
    await expect(listLocalProperties()).resolves.toEqual([mockProperties[1]]);
  });

  it('restores fixtures when the mock browser store contains an empty list', async () => {
    await AsyncStorage.setItem('@broaker/web-properties/v1', JSON.stringify([]));
    await expect(listLocalProperties()).resolves.toEqual(mockProperties);
  });

  it('gets, replaces, and deletes a local property', async () => {
    const property = mockProperties[0];
    await saveLocalProperty(property);
    await expect(getLocalProperty(property.id)).resolves.toEqual(property);

    const updated = { ...property, title: 'Updated property title' };
    await saveLocalProperty(updated);
    await expect(listLocalProperties()).resolves.toEqual([updated, mockProperties[1]]);

    await deleteLocalProperty(property.id);
    await expect(getLocalProperty(property.id)).resolves.toBeNull();
    await expect(listLocalProperties()).resolves.toEqual([mockProperties[1]]);
  });

  it('reports whether mock records were seeded only on the first call', async () => {
    await expect(seedMockPropertiesIfNeeded()).resolves.toBe(true);
    await expect(seedMockPropertiesIfNeeded()).resolves.toBe(false);
  });

  it('surfaces corrupted persisted data instead of silently discarding it', async () => {
    await AsyncStorage.setItem('@broaker/web-properties/v1', '{invalid json');
    await expect(listLocalProperties()).rejects.toThrow();
  });
});
