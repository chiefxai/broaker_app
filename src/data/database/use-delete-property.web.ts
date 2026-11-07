import { useQueryClient } from '@tanstack/react-query';
import { useOptionalAuth } from '@/auth/auth-provider';
import { archiveProperty, deleteProperty } from '@/api/backend-api';

import { isMockMode } from '@/data/app-mode';
import { deleteLocalProperty, getLocalProperty, saveLocalProperty } from './property-repository.web';
import { localPropertyKeys } from './use-local-properties.web';

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const auth = useOptionalAuth();
  return async (propertyId: string, statusLabel: string) => {
    const isDraft = statusLabel.toLowerCase() === 'draft';
    if (isMockMode) {
      if (isDraft) await deleteLocalProperty(propertyId);
      else {
        const property = await getLocalProperty(propertyId);
        if (property) await saveLocalProperty({ ...property, status: { label: 'Archived', tone: 'neutral' } });
      }
    } else {
      if (!auth?.accessToken) throw new Error('Sign in before changing this property.');
      if (isDraft) await deleteProperty(auth.accessToken, propertyId);
      else await archiveProperty(auth.accessToken, propertyId);
    }
    await queryClient.invalidateQueries({ queryKey: localPropertyKeys.all });
  };
}
