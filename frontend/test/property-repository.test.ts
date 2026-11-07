import type { SQLiteDatabase } from 'expo-sqlite';

import { mockProperties } from '@/data/mock/properties';
import { deleteLocalProperty, getLocalProperty, listLocalProperties, saveLocalProperty, seedMockPropertiesIfNeeded } from '@/data/database/property-repository';

function makeDatabase(overrides: Partial<SQLiteDatabase> = {}) {
  return {
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
    withTransactionAsync: jest.fn(async (work: () => Promise<void>) => work()),
    ...overrides,
  } as unknown as SQLiteDatabase;
}

describe('local property repository', () => {
  it('lists locally stored property records', async () => {
    const property = mockProperties[0];
    const db = makeDatabase({
      getAllAsync: jest.fn().mockResolvedValue([{ id: property.id, payload_json: JSON.stringify(property), created_at: 'now', updated_at: 'now' }]),
    });

    await expect(listLocalProperties(db)).resolves.toEqual([{ ...property, remoteId: null, ownerSub: null, syncStatus: 'synced' }]);
    expect(db.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('ORDER BY updated_at DESC, id ASC'));
  });

  it('returns null for a property that is not present', async () => {
    await expect(getLocalProperty(makeDatabase(), 'missing-id')).resolves.toBeNull();
  });

  it('writes values as bound parameters instead of interpolating property data into SQL', async () => {
    const property = mockProperties[0];
    const db = makeDatabase();

    await saveLocalProperty(db, property);

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT(id) DO UPDATE'),
      property.id,
      JSON.stringify(property),
      expect.any(String),
      expect.any(String),
      null,
      null,
      'synced',
      null,
      0,
      null,
    );
  });

  it('deletes by bound ID', async () => {
    const db = makeDatabase();
    await deleteLocalProperty(db, 'property-id');
    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM properties WHERE id = ?', 'property-id');
  });

  it('seeds mock rows once and does not overwrite existing local data', async () => {
    const db = makeDatabase({
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ value: 'seeded' }),
    });

    await expect(seedMockPropertiesIfNeeded(db, mockProperties)).resolves.toBe(true);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledTimes(1); // marker only; the existing row remains untouched
    expect(await seedMockPropertiesIfNeeded(db, mockProperties)).toBe(false);
  });
});
