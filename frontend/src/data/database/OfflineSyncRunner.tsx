import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useOptionalAuth } from '@/auth/auth-provider';
import { syncPendingLocalProperties } from './offline-sync';

/** Retries queued property and asset writes while the signed-in app is foregrounded. */
export function OfflineSyncRunner() {
  const db = useSQLiteContext();
  const auth = useOptionalAuth();
  const accessToken = auth?.accessToken;
  const ownerSub = auth?.currentUser?.sub;
  const queryClient = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    if (!accessToken || !ownerSub) return;
    const sync = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const result = await syncPendingLocalProperties(db, accessToken, ownerSub);
        if (result.synced) {
          await queryClient.invalidateQueries({ queryKey: ['local-properties'] });
          await queryClient.invalidateQueries({ queryKey: ['backend', 'dashboard'] });
        }
      } finally {
        running.current = false;
      }
    };
    void sync();
    const timer = setInterval(() => void sync(), 15_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [accessToken, ownerSub, db, queryClient]);

  return null;
}
