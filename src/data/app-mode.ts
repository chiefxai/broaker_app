export type AppMode = 'mock' | 'live';

const configuredMode = process.env.EXPO_PUBLIC_APP_MODE;

export const appMode: AppMode = configuredMode === 'mock' || configuredMode === 'test' || process.env.NODE_ENV === 'test' ? 'mock' : 'live';
export const isMockMode = appMode === 'mock';
