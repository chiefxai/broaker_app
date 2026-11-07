import { useQuery } from '@tanstack/react-query';

import { listProperties, getProperty, photoRefreshInterval } from '@/api/backend-api';
import { isMockMode } from '@/data/app-mode';
import { useOptionalAuth } from '@/auth/auth-provider';
import { getLocalProperty, listLocalProperties } from './property-repository';

export const localPropertyKeys = {
  all: ['local-properties'] as const,
  detail: (id: string) => ['local-properties', id] as const,
};

export function useLocalProperties() {
  const auth = useOptionalAuth();
  return useQuery({
    queryKey: [...localPropertyKeys.all, isMockMode ? 'mock' : 'api'],
    enabled: isMockMode || Boolean(auth?.accessToken),
    refetchInterval: (query) => isMockMode ? false : photoRefreshInterval(query.state.data),
    queryFn: () => isMockMode
      ? listLocalProperties()
      : auth?.accessToken ? listProperties(auth.accessToken) : Promise.reject(new Error('Sign in to load properties.')),
  });
}

export function useLocalProperty(id: string) {
  const auth = useOptionalAuth();
  return useQuery({
    queryKey: [...localPropertyKeys.detail(id), isMockMode ? 'mock' : 'api'],
    queryFn: () => isMockMode
      ? getLocalProperty(id)
      : auth?.accessToken ? getProperty(auth.accessToken, id) : Promise.reject(new Error('Sign in to load properties.')),
    refetchInterval: (query) => isMockMode ? false : photoRefreshInterval(query.state.data ? [query.state.data] : []),
    enabled: Boolean(id) && (isMockMode || Boolean(auth?.accessToken)),
  });
}
