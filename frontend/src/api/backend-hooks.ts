import { useQuery } from '@tanstack/react-query';

import { useOptionalAuth } from '@/auth/auth-provider';
import { isMockMode } from '@/data/app-mode';
import { getBusinessProfile, getDashboard, listSharedLinks, photoRefreshInterval } from './backend-api';

export function useBackendDashboard() {
  const auth = useOptionalAuth();
  return useQuery({
    queryKey: ['backend', 'dashboard'],
    queryFn: () => auth?.accessToken
      ? getDashboard(auth.accessToken)
      : Promise.reject(new Error('Sign in to load dashboard data.')),
    enabled: !isMockMode && Boolean(auth?.accessToken),
  });
}

export function useBusinessProfile() {
  const auth = useOptionalAuth();
  return useQuery({
    queryKey: ['backend', 'business-profile'],
    queryFn: () => auth?.accessToken
      ? getBusinessProfile(auth.accessToken)
      : Promise.reject(new Error('Sign in to load the business profile.')),
    enabled: !isMockMode && Boolean(auth?.accessToken),
  });
}

export function useBackendSharedLinks() {
  const auth = useOptionalAuth();
  return useQuery({
    queryKey: ['backend', 'shared-links'],
    queryFn: () => auth?.accessToken
      ? listSharedLinks(auth.accessToken)
      : Promise.reject(new Error('Sign in to load shared links.')),
    enabled: !isMockMode && Boolean(auth?.accessToken),
    refetchInterval: (query) => photoRefreshInterval(query.state.data),
  });
}
