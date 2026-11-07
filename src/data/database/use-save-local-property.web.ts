import { saveLocalProperty } from './property-repository.web';
import type { LocalProperty } from '@/data/mock/properties';

export function useSaveLocalProperty() {
  return (property: LocalProperty) => saveLocalProperty(property);
}
