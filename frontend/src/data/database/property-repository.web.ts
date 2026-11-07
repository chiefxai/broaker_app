import AsyncStorage from '@react-native-async-storage/async-storage';

import { isMockMode } from '@/data/app-mode';
import { mockProperties, type LocalProperty } from '@/data/mock/properties';

const STORAGE_KEY = '@broaker/web-properties/v1';

function isLocalPropertyList(value: unknown): value is LocalProperty[] {
  return Array.isArray(value) && value.every((item) =>
    Boolean(item) && typeof item === 'object' && typeof item.id === 'string' && typeof item.title === 'string');
}

async function readProperties(): Promise<LocalProperty[] | null> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  if (saved === null) return null;
  const parsed: unknown = JSON.parse(saved);
  if (!isLocalPropertyList(parsed)) throw new Error('Saved browser property data is invalid.');
  return parsed;
}

async function writeProperties(properties: LocalProperty[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
}

export async function listLocalProperties(): Promise<LocalProperty[]> {
  const saved = await readProperties();
  if (saved !== null && (saved.length > 0 || !isMockMode)) return saved;
  // An empty browser list can be left behind when switching from live to mock
  // mode. Restore demo fixtures so the mock app remains useful for UI review.
  const initial = isMockMode ? mockProperties : [];
  await writeProperties(initial);
  return initial;
}

export async function getLocalProperty(id: string): Promise<LocalProperty | null> {
  const properties = await listLocalProperties();
  return properties.find((property) => property.id === id) ?? null;
}

export async function saveLocalProperty(property: LocalProperty): Promise<void> {
  const properties = await listLocalProperties();
  const existingIndex = properties.findIndex((item) => item.id === property.id);
  if (existingIndex === -1) {
    await writeProperties([property, ...properties]);
    return;
  }
  const next = [...properties];
  next[existingIndex] = property;
  await writeProperties(next);
}

export async function deleteLocalProperty(id: string): Promise<void> {
  const properties = await listLocalProperties();
  await writeProperties(properties.filter((property) => property.id !== id));
}

export async function seedMockPropertiesIfNeeded(): Promise<boolean> {
  const saved = await readProperties();
  if (saved !== null) return false;
  await writeProperties(isMockMode ? mockProperties : []);
  return isMockMode;
}
