import { useSQLiteContext } from 'expo-sqlite';

import { saveLocalProperty } from './property-repository';
import type { LocalProperty } from '@/data/mock/properties';

export function useSaveLocalProperty() {
  const db = useSQLiteContext();
  return (property: LocalProperty) => saveLocalProperty(db, property);
}
