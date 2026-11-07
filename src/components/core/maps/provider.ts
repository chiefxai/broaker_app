export type MapProviderId = 'openstreetmap' | 'google';

/** Set this once to change the provider used by all shared map components. */
export const DEFAULT_MAP_PROVIDER: MapProviderId = 'google';

/** Initial viewport for the app's India-focused property listings before a GPS pin exists. */
export const DEFAULT_MAP_CENTER = { latitude: 13.0827, longitude: 80.2707 } as const;

export const MAP_PROVIDERS = {
  openstreetmap: {
    attribution: '© OpenStreetMap contributors',
    attributionUrl: 'https://www.openstreetmap.org/copyright',
    userAgent: 'Broaker/1.0',
  },
  google: {
    attribution: 'Google Maps',
    webApiKeyEnv: 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB',
    iosApiKeyEnv: 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS',
    androidApiKeyEnv: 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID',
  },
} as const;

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}

export function parseMapPointMessage(message: string): { latitude: number; longitude: number } | null {
  try {
    const parsed: unknown = JSON.parse(message);
    if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)
      || parsed.type !== 'broaker-map-point' || !('latitude' in parsed) || !('longitude' in parsed)
      || typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number'
      || !isValidCoordinate(parsed.latitude, parsed.longitude)) return null;
    return { latitude: parsed.latitude, longitude: parsed.longitude };
  } catch {
    return null;
  }
}

export function parseMapInteractionMessage(message: string): boolean | null {
  try {
    const parsed: unknown = JSON.parse(message);
    if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)
      || parsed.type !== 'broaker-map-interaction' || !('active' in parsed)
      || typeof parsed.active !== 'boolean') return null;
    return parsed.active;
  } catch {
    return null;
  }
}

