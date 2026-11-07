import { createProfileShareLink, getPreferences, toPublicProfileShareAppUrl } from '@/api/backend-api';
import { shareOrCopyUrl, type ShareLinkResult } from '@/utils/share-link';
import { getDefaultExpirationTimestamp } from '@/utils/share-expiration';

export async function createAndShareBusinessProfile(accessToken: string, businessName: string): Promise<ShareLinkResult> {
  const preferences = await getPreferences(accessToken);
  const days = preferences.default_expiration_days ?? null;
  const expiresAt = getDefaultExpirationTimestamp(days);
  const link = await createProfileShareLink(accessToken, {
    title: `${businessName.trim() || 'Business'} profile`,
    include_profile: true,
    include_properties: true,
    visibility: 'unlisted',
    expires_at: expiresAt,
  });
  const url = toPublicProfileShareAppUrl(link.public_url);
  if (!url) throw new Error('The profile link was created without a share URL.');
  return shareOrCopyUrl(url);
}
