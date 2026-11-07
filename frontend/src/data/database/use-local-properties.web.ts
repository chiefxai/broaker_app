import { useQuery } from '@tanstack/react-query';

import { listProperties, getProperty, photoRefreshInterval } from '@/api/backend-api';
import { isMockMode } from '@/data/app-mode';
import { useOptionalAuth } from '@/auth/auth-provider';
import { getLocalProperty, listLocalProperties, saveLocalProperty } from './property-repository.web';

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
    queryFn: async () => {
      if (isMockMode) return listLocalProperties();
      if (!auth?.accessToken) throw new Error('Sign in to load properties.');
      try {
        const remote = await listProperties(auth.accessToken);
        const local = await listLocalProperties();
        const ownerSub = auth.currentUser?.sub ?? null;
        for (const property of local) {
          if (property.ownerSub == null && property.syncStatus !== 'synced' && ownerSub) {
            await saveLocalProperty({ ...property, ownerSub });
          }
        }
        const pending = local.filter((property) =>
          (property.ownerSub === ownerSub || property.ownerSub == null)
          && property.syncStatus !== 'synced');
        const pendingRemoteIds = new Set(pending.map((property) => property.remoteId).filter(Boolean));
        return [
          ...pending,
          ...remote.filter((property) => !pendingRemoteIds.has(property.id)).map((property) => ({
            ...property,
            remoteId: property.id,
            ownerSub,
            syncStatus: 'synced' as const,
          })),
        ];
      } catch (error) {
        const local = await listLocalProperties();
        return local.filter((property) => property.ownerSub === auth.currentUser?.sub || property.ownerSub == null);
      }
    },
  });
}

export function useLocalProperty(id: string) {
  const auth = useOptionalAuth();
  return useQuery({
    queryKey: [...localPropertyKeys.detail(id), isMockMode ? 'mock' : 'api'],
    queryFn: async () => {
      if (isMockMode) return getLocalProperty(id);
      if (!auth?.accessToken) throw new Error('Sign in to load properties.');
      const local = await getLocalProperty(id);
      const remoteId = local?.remoteId ?? (local?.syncStatus === 'synced' ? id : null);
      if (!remoteId) return local;
      try {
        const remote = await getProperty(auth.accessToken, remoteId);
        const saved = {
          ...remote,
          id: local?.id ?? remote.id,
          remoteId: remote.id,
          ownerSub: auth.currentUser?.sub ?? local?.ownerSub,
          syncStatus: local?.syncStatus === 'pending' ? 'pending' as const : 'synced' as const,
          ...(local?.offlineDraft ? { offlineDraft: local.offlineDraft, offlineStep: local.offlineStep } : {}),
        };
        await saveLocalProperty(saved);
        return saved;
      } catch (error) {
        if (local) return local;
        throw error;
      }
    },
    refetchInterval: (query) => isMockMode ? false : photoRefreshInterval(query.state.data ? [query.state.data] : []),
    enabled: Boolean(id) && (isMockMode || Boolean(auth?.accessToken)),
  });
}
