import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import { listProperties, getProperty, photoRefreshInterval } from '@/api/backend-api';
import { isMockMode } from '@/data/app-mode';
import { useOptionalAuth } from '@/auth/auth-provider';
import { getLocalProperty, listLocalProperties, saveLocalProperty } from './property-repository';

export const localPropertyKeys = {
  all: ['local-properties'] as const,
  detail: (id: string) => ['local-properties', id] as const,
};

export function useLocalProperties() {
  const db = useSQLiteContext();
  const auth = useOptionalAuth();
  return useQuery({
    queryKey: [...localPropertyKeys.all, isMockMode ? 'mock' : 'api'],
    enabled: isMockMode || Boolean(auth?.accessToken),
    refetchInterval: (query) => isMockMode ? false : photoRefreshInterval(query.state.data),
    queryFn: async () => {
      if (isMockMode) return listLocalProperties(db);
      if (!auth?.accessToken || !auth.currentUser?.sub) return listLocalProperties(db);
      try {
        const remote = await listProperties(auth.accessToken);
        for (const property of remote) await saveLocalProperty(db, { ...property, remoteId: property.id, ownerSub: auth.currentUser.sub, syncStatus: 'synced' });
        const local = await listLocalProperties(db);
        const unowned = local.filter((property) => property.ownerSub == null && property.syncStatus !== 'synced');
        for (const property of unowned) await saveLocalProperty(db, { ...property, ownerSub: auth.currentUser.sub });
        const pending = local.filter((property) => (property.ownerSub === auth.currentUser!.sub || property.ownerSub == null) && property.syncStatus !== 'synced');
        const pendingRemoteIds = new Set(pending.map((property) => property.remoteId).filter(Boolean));
        return [...pending, ...remote.filter((property) => !pendingRemoteIds.has(property.id))];
      } catch {
        const local = await listLocalProperties(db);
        return local.filter((property) => property.ownerSub === auth.currentUser!.sub || property.ownerSub == null);
      }
    },
  });
}

export function useLocalProperty(id: string) {
  const db = useSQLiteContext();
  const auth = useOptionalAuth();
  return useQuery({
    queryKey: [...localPropertyKeys.detail(id), isMockMode ? 'mock' : 'api'],
    queryFn: async () => {
      if (isMockMode) return getLocalProperty(db, id);
      const local = await getLocalProperty(db, id);
      if (!auth?.accessToken) return local;
      const remoteId = local?.remoteId ?? id;
      try {
        const remote = await getProperty(auth.accessToken, remoteId);
        const saved = { ...remote, id: local?.id ?? remote.id, remoteId: remote.id, ownerSub: auth.currentUser?.sub ?? local?.ownerSub, syncStatus: local?.syncStatus === 'pending' ? 'pending' as const : 'synced' as const };
        await saveLocalProperty(db, saved);
        return { ...saved, ...(local?.offlineDraft ? { offlineDraft: local.offlineDraft, offlineStep: local.offlineStep } : {}) };
      } catch {
        return local;
      }
    },
    refetchInterval: (query) => isMockMode ? false : photoRefreshInterval(query.state.data ? [query.state.data] : []),
    enabled: Boolean(id) && (isMockMode || Boolean(auth?.accessToken)),
  });
}
