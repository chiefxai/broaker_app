import { isAxiosError } from 'axios';
import { apiClient } from './client';
import type { LocalProperty } from '@/data/mock/properties';
import type { MockSharedLink } from '@/data/mock/shared-links';
import { formatArea, formatInr } from '@/utils/formatters';

export type PropertyCategory = 'agriculture' | 'plots' | 'house_villa' | 'commercial' | 'apartment';
export type PropertyStatus = 'draft' | 'active' | 'archived';

export interface ApiPropertySummary {
  id: string;
  title: string;
  category: PropertyCategory;
  status: PropertyStatus;
  completion_percent: number;
  created_at: string;
  updated_at: string;
}

export interface ApiLocation {
  address_line?: string | null;
  village?: string | null;
  taluk?: string | null;
  district?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pincode?: string | null;
  road_access_type?: string | null;
  road_width_ft?: number | null;
  frontage_direction?: string | null;
  width_ft?: number | null;
  length_ft?: number | null;
  road_subdivision_basis?: string | null;
  highway_distance_km?: number | null;
  survey_numbers?: string[];
}

export interface ApiFinancials {
  currency?: 'INR';
  asking_price_inr?: number | null;
  minimum_price_inr?: number | null;
  area?: number | null;
  area_unit?: string | null;
  negotiable?: boolean | null;
  advance_amount_inr?: number | null;
  outstanding_loan_inr?: number | null;
  lending_bank?: string | null;
}

export interface ApiFeatures {
  soil_type?: 'red' | 'black' | 'alluvial' | 'sandy_loam' | 'other' | null;
  soil_type_other?: string | null;
  water_tds_ppm?: number | null;
  agronomist_notes?: string | null;
  water_sources?: { source_type: 'river' | 'canal' | 'borewell' | 'open_well' | 'government_supply' | 'other'; label?: string | null; depth_ft?: number | null; diameter_ft?: number | null; yield_inches?: number | null; seasonality?: string | null; details?: string | null }[];
  utilities?: { utility_type: 'electricity' | 'irrigation' | 'fencing' | 'road_access' | 'other'; available: boolean; details?: string | null }[];
}

export interface ApiLegal {
  title_classification?: 'ryotwari_patta' | 'natham' | 'gramathu_natham' | 'other' | null;
  legal_summary?: string | null;
}

export interface ApiProperty extends ApiPropertySummary {
  description?: string | null;
  location?: ApiLocation | null;
  financials?: ApiFinancials | null;
  features?: ApiFeatures | null;
  legal?: ApiLegal | null;
}

export type ApiPropertyCreate = Pick<ApiPropertySummary, 'title' | 'category'>;
export type ApiPropertyPatch = Partial<Pick<ApiProperty, 'title' | 'description' | 'category'>>;

export async function createPropertyDraft(accessToken: string, input: ApiPropertyCreate): Promise<ApiPropertySummary> {
  const { data } = await apiClient.post<ApiPropertySummary>('/properties', input, { headers: bearer(accessToken) });
  return data;
}

export async function patchProperty(accessToken: string, propertyId: string, input: ApiPropertyPatch): Promise<ApiProperty> {
  const { data } = await apiClient.patch<ApiProperty>(`/properties/${encodeURIComponent(propertyId)}`, input, { headers: bearer(accessToken) });
  return data;
}

export async function savePropertyLocation(accessToken: string, propertyId: string, input: ApiLocation): Promise<ApiLocation> {
  const { data } = await apiClient.put<ApiLocation>(`/properties/${encodeURIComponent(propertyId)}/location`, input, { headers: bearer(accessToken) });
  return data;
}

export async function savePropertyFeatures(accessToken: string, propertyId: string, input: ApiFeatures): Promise<ApiFeatures> {
  const { data } = await apiClient.put<ApiFeatures>(`/properties/${encodeURIComponent(propertyId)}/features`, input, { headers: bearer(accessToken) });
  return data;
}

export async function savePropertyFinancials(accessToken: string, propertyId: string, input: ApiFinancials): Promise<ApiFinancials> {
  const { data } = await apiClient.put<ApiFinancials>(`/properties/${encodeURIComponent(propertyId)}/financials`, input, { headers: bearer(accessToken) });
  return data;
}

export async function savePropertyLegal(accessToken: string, propertyId: string, input: ApiLegal): Promise<ApiLegal> {
  const { data } = await apiClient.put<ApiLegal>(`/properties/${encodeURIComponent(propertyId)}/legal`, input, { headers: bearer(accessToken) });
  return data;
}

export async function savePropertyPrivateNotes(accessToken: string, propertyId: string, notes: string | null): Promise<void> {
  await apiClient.put(`/properties/${encodeURIComponent(propertyId)}/notes`, { notes }, { headers: bearer(accessToken) });
}

export async function publishProperty(accessToken: string, propertyId: string): Promise<ApiProperty> {
  const { data } = await apiClient.post<ApiProperty>(`/properties/${encodeURIComponent(propertyId)}/publish`, undefined, { headers: bearer(accessToken) });
  return data;
}

export async function deleteProperty(accessToken: string, propertyId: string): Promise<void> {
  await apiClient.delete(`/properties/${encodeURIComponent(propertyId)}`, { headers: bearer(accessToken) });
}

export async function archiveProperty(accessToken: string, propertyId: string): Promise<ApiProperty> {
  const { data } = await apiClient.post<ApiProperty>(`/properties/${encodeURIComponent(propertyId)}/archive`, undefined, { headers: bearer(accessToken) });
  return data;
}

export interface ApiPropertyDocument {
  id: string;
  object_key: string;
  filename: string;
  content_type: string;
  category: ApiDocumentCategory;
  display_name?: string | null;
  created_at: string;
  visibility?: 'private' | 'shared' | 'public';
  upload_status?: 'uploaded' | 'pending' | 'failed';
  size_bytes?: number | null;
}

export type ApiDocumentCategory = 'photo' | 'title_deed' | 'survey' | 'soil_report' | 'voice_memo' | 'other';
export type ApiUploadContentType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | 'audio/mp4' | 'audio/aac' | 'audio/mpeg' | 'audio/wav' | 'audio/webm';

export interface ApiPropertyUploadRequest {
  filename: string;
  content_type: ApiUploadContentType;
}

export interface ApiPropertyUploadResponse {
  upload_url: string;
  object_key: string;
  method: 'PUT';
  expires_in: number;
  content_type: string;
}

export interface ApiPropertyDocumentCreate {
  object_key: string;
  filename: string;
  content_type: string;
  category: ApiDocumentCategory;
  display_name?: string | null;
}

export interface ApiSigningAuthority {
  id: string;
  name: string;
  phone: string | null;
  relationship: string;
  record_label: string | null;
  record_value: string | null;
  verification_status: 'pending';
  signature_status: 'pending';
  created_at: string;
  updated_at: string;
}

export interface ApiSigningAuthorityInput {
  name: string;
  phone: string | null;
  relationship: string;
  record_label: string | null;
  record_value: string | null;
}

export interface ApiSigningAuthorityList {
  items: ApiSigningAuthority[];
}

export interface ApiPropertyPage {
  items: ApiPropertySummary[];
  limit: number;
  offset: number;
  total: number;
}

export interface ApiBusinessProfile {
  business_name?: string | null;
  public_phone?: string | null;
  public_email?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
}

export interface ApiBrokerProfile {
  legal_name: string;
  mobile_phone?: string | null;
  operating_language?: string;
  designation?: string | null;
  license_number?: string | null;
  license_jurisdiction?: string | null;
  account_email?: string;
  created_at?: string;
  updated_at?: string;
}

export type ApiDefaultExpirationDays = 1 | 7 | 30 | 90 | 365 | null;

export interface ApiPreferences {
  language?: string;
  theme?: 'light' | 'dark';
  default_disclosures?: ApiShareDisclosures;
  default_expiration_days?: ApiDefaultExpirationDays;
}

export interface ApiOnboardingStatus {
  completed: boolean;
  current_step?: string | null;
  completed_steps: string[];
}

export interface ApiShareDisclosures {
  show_name?: boolean;
  show_description?: boolean;
  show_location?: boolean;
  show_price: boolean;
  show_specifications?: boolean;
  show_exact_coordinates: boolean;
  show_photos: boolean;
  show_reports: boolean;
  show_documents?: boolean;
  show_broker_contact?: boolean;
  show_approach_roads: boolean;
}

export interface ApiPropertyCategory {
  code: PropertyCategory;
  label: string;
  sort_order: number;
  enabled: boolean;
}

export interface ApiPropertyCategoryUpdate {
  items: { code: PropertyCategory; enabled: boolean; sort_order: number }[];
}

export interface ApiDashboard {
  property_counts?: { draft?: number; active?: number; archived?: number };
  recent_properties?: ApiPropertySummary[];
}

export interface ApiShareLink {
  id: string;
  title: string;
  expires_at: string | null;
  revoked_at?: string | null;
  disclosures: ApiShareDisclosures;
  visibility: 'private' | 'protected' | 'unlisted';
  public_url: string | null;
  created_at: string;
}

export interface ApiShareLinkPage {
  items: ApiShareLink[];
  limit: number;
  offset: number;
  total: number;
}

export interface ApiProfileShareLink {
  id: string; title: string; include_profile: boolean; include_properties: boolean;
  property_ids?: string[] | null;
  property_disclosures?: Record<string, ApiShareDisclosures>;
  visibility: 'protected' | 'unlisted'; public_url: string | null;
  expires_at: string | null; revoked_at: string | null; created_at: string;
}
export interface ApiProfileShareLinkPage { items: ApiProfileShareLink[]; limit: number; offset: number; total: number }
export interface ApiPublicProfileShare {
  profile?: { business_name?: string | null; professional_title?: string | null; public_phone?: string | null; public_email?: string | null; city?: string | null; district?: string | null; state?: string | null } | null;
  properties?: { public_listing_token: string; title: string; description?: string | null; category: string; asking_price_inr?: number | null; area?: number | null; area_unit?: string | null; approximate_location?: string | null }[] | null;
}

export async function listProfileShareLinks(accessToken: string): Promise<ApiProfileShareLink[]> {
  const items: ApiProfileShareLink[] = [];
  let offset = 0;
  let total = 0;
  do {
    const { data } = await apiClient.get<ApiProfileShareLinkPage>('/profile/share-links', { headers: bearer(accessToken), params: { limit: 100, offset } });
    items.push(...data.items); total = data.total; offset = data.offset + data.items.length;
  } while (offset < total);
  return items;
}

export async function createProfileShareLink(accessToken: string, input: Pick<ApiProfileShareLink, 'title' | 'include_profile' | 'include_properties'> & { property_ids?: string[]; property_disclosures?: Record<string, ApiShareDisclosures>; visibility: 'protected' | 'unlisted'; passcode?: string; expires_at: string | null }): Promise<ApiProfileShareLink> {
  const { data } = await apiClient.post<ApiProfileShareLink>('/profile/share-links', input, { headers: bearer(accessToken) });
  return data;
}

export async function updateProfileShareLink(accessToken: string, id: string, input: Partial<Pick<ApiProfileShareLink, 'title' | 'include_profile' | 'include_properties' | 'property_ids' | 'property_disclosures' | 'visibility' | 'expires_at'>> & { passcode?: string }): Promise<ApiProfileShareLink> {
  const { data } = await apiClient.patch<ApiProfileShareLink>(`/profile/share-links/${encodeURIComponent(id)}`, input, { headers: bearer(accessToken) });
  return data;
}

export async function revokeProfileShareLink(accessToken: string, id: string): Promise<void> {
  await apiClient.delete(`/profile/share-links/${encodeURIComponent(id)}`, { headers: bearer(accessToken) });
}

export async function getPublicProfileShare(token: string, passcode?: string): Promise<ApiPublicProfileShare> {
  const { data } = await apiClient.get<ApiPublicProfileShare>(`/public/profiles/${encodeURIComponent(token)}`, { headers: passcode ? { 'X-Share-Passcode': passcode } : undefined });
  return data;
}

export function toPublicProfileShareAppUrl(publicApiUrl: string | null | undefined): string | null {
  if (!publicApiUrl) return null;
  let token: string;
  try { token = new URL(publicApiUrl).pathname.split('/').filter(Boolean).pop() ?? ''; } catch { return publicApiUrl; }
  if (!token) return publicApiUrl;
  const currentOrigin = typeof window !== 'undefined' ? window.location?.origin : undefined;
  const appBase = process.env.EXPO_PUBLIC_PUBLIC_APP_URL || (currentOrigin && currentOrigin !== 'null' ? currentOrigin : '');
  return appBase ? `${appBase.replace(/\/+$/, '')}/broker/${encodeURIComponent(decodeURIComponent(token))}` : publicApiUrl;
}

export type ShareVisibility = ApiShareLink['visibility'];
export interface ApiShareLinkInput extends Pick<ApiShareLink, 'title' | 'expires_at' | 'disclosures'> {
  visibility?: ShareVisibility;
  passcode?: string | null;
}

export async function getPropertyShareLinks(accessToken: string, propertyId: string): Promise<ApiShareLink[]> {
  const links: ApiShareLink[] = [];
  let offset = 0;
  let total = 0;
  do {
    const { data } = await apiClient.get<ApiShareLinkPage>(`/properties/${encodeURIComponent(propertyId)}/share-links`, {
      headers: bearer(accessToken), params: { limit: 100, offset },
    });
    links.push(...data.items);
    total = data.total;
    offset = data.offset + data.items.length;
  } while (offset < total);
  return links;
}

export async function createPropertyShareLink(accessToken: string, propertyId: string, input: ApiShareLinkInput): Promise<ApiShareLink> {
  const { data } = await apiClient.post<ApiShareLink>(`/properties/${encodeURIComponent(propertyId)}/share-links`, input, { headers: bearer(accessToken) });
  return data;
}

export interface ApiPublicListing {
  title?: string;
  description?: string | null;
  category?: PropertyCategory;
  specifications?: { category?: string | null; area?: number | null; area_unit?: string | null; soil_type?: string | null; soil_type_other?: string | null; water_tds_ppm?: number | null; agronomist_notes?: string | null; water_sources?: { source_type: string; label?: string | null; depth_ft?: number | null; diameter_ft?: number | null; yield_inches?: number | null; seasonality?: string | null; details?: string | null }[]; utilities?: { utility_type: string; available: boolean; details?: string | null }[] };
  asking_price_inr?: number | null;
  area?: number | null;
  area_unit?: string | null;
  approximate_location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  road_access_type?: string | null;
  road_width_ft?: number | null;
  media?: { url: string; name: string }[];
  reports?: { url: string; name: string }[];
  documents?: { url: string; name: string; category: string }[];
  broker_contact?: {
    business_name?: string | null;
    public_phone?: string | null;
    public_email?: string | null;
    city?: string | null;
    district?: string | null;
    state?: string | null;
  } | null;
}

function normalizePublicListingAssetUrl(url: string): string {
  try {
    const apiBase = new URL(apiClient.defaults.baseURL ?? '');
    const assetUrl = new URL(url, apiBase);
    const apiPath = apiBase.pathname.replace(/\/+$/, '');
    if (!assetUrl.pathname.startsWith(`${apiPath}/public/listings/`)) return url;

    // The API builds these proxy URLs from PUBLIC_API_BASE_URL. In local device
    // sessions that host can differ from EXPO_PUBLIC_API_URL, so keep the path
    // and token while routing the request through the API host the client uses.
    assetUrl.protocol = apiBase.protocol;
    assetUrl.host = apiBase.host;
    return assetUrl.toString();
  } catch {
    return url;
  }
}

export async function getPublicListing(token: string, passcode?: string, accessToken?: string): Promise<ApiPublicListing> {
  const headers: Record<string, string> = {};
  if (passcode) headers['X-Share-Passcode'] = passcode;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const { data } = await apiClient.get<ApiPublicListing>(`/public/listings/${encodeURIComponent(token)}`, {
    headers: Object.keys(headers).length ? headers : undefined,
  });
  return {
    ...data,
    media: data.media?.map((item) => ({ ...item, url: normalizePublicListingAssetUrl(item.url) })),
    reports: data.reports?.map((item) => ({ ...item, url: normalizePublicListingAssetUrl(item.url) })),
    documents: data.documents?.map((item) => ({ ...item, url: normalizePublicListingAssetUrl(item.url) })),
  };
}

export function toPublicListingAppUrl(publicApiUrl: string | null | undefined): string | null {
  if (!publicApiUrl) return null;
  let token: string;
  try {
    token = new URL(publicApiUrl).pathname.split('/').filter(Boolean).pop() ?? '';
  } catch {
    return publicApiUrl;
  }
  if (!token) return publicApiUrl;
  const appBase = process.env.EXPO_PUBLIC_PUBLIC_APP_URL
    || (typeof window !== 'undefined' && window.location.origin !== 'null' ? window.location.origin : '');
  return appBase ? `${appBase.replace(/\/+$/, '')}/share/${encodeURIComponent(decodeURIComponent(token))}` : publicApiUrl;
}

export async function updatePropertyShareLink(accessToken: string, shareLinkId: string, input: Partial<ApiShareLinkInput>): Promise<ApiShareLink> {
  const { data } = await apiClient.patch<ApiShareLink>(`/share-links/${encodeURIComponent(shareLinkId)}`, input, { headers: bearer(accessToken) });
  return data;
}

export async function deletePropertyShareLink(accessToken: string, shareLinkId: string): Promise<void> {
  await apiClient.delete(`/share-links/${encodeURIComponent(shareLinkId)}`, { headers: bearer(accessToken) });
}

const categoryLabels: Record<PropertyCategory, string> = {
  agriculture: 'Agriculture Land',
  plots: 'Plot',
  house_villa: 'House / Villa',
  commercial: 'Commercial',
  apartment: 'Apartment',
};

function bearer(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export function toLocalProperty(property: ApiPropertySummary | ApiProperty): LocalProperty {
  const detail = property as ApiProperty;
  const financials = detail.financials;
  const location = detail.location;
  const locationText = [location?.village ?? location?.address_line, location?.district, location?.state]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(', ');
  const statusLabel = property.status[0].toUpperCase() + property.status.slice(1);
  const facts: NonNullable<LocalProperty['facts']> = [];

  if (property.category) facts.push({ icon: 'domain', label: 'Property type', value: categoryLabels[property.category] });
  if (locationText) facts.push({ icon: 'location_on', label: 'Location', value: location?.district ?? locationText, detail: location?.state ?? undefined });
  if (location?.frontage_direction || location?.width_ft != null) facts.push({ icon: 'compass_calibration', label: 'Frontage', value: location.width_ft != null ? `${location.width_ft} Feet` : location.frontage_direction ?? 'Recorded', detail: location.frontage_direction ? `${location.frontage_direction}-facing` : undefined });
  if (location?.road_access_type || location?.road_width_ft != null) facts.push({ icon: 'add_road', label: 'Road access', value: [location.road_width_ft != null ? `${location.road_width_ft} ft` : null, location.road_access_type].filter(Boolean).join(' ') || 'Available', detail: location.road_subdivision_basis ?? undefined });
  if (location?.length_ft != null) facts.push({ icon: 'straighten', label: 'Parcel length', value: `${location.length_ft} ft` });
  if (detail.features?.soil_type) facts.push({ icon: 'eco', label: 'Soil type', value: detail.features.soil_type.replaceAll('_', ' ') });
  if (detail.features?.water_sources?.length) facts.push({ icon: 'water_drop', label: 'Water sources', value: detail.features.water_sources.map((source) => source.label || source.source_type.replaceAll('_', ' ')).join(' · '), detail: detail.features.water_tds_ppm != null ? `${detail.features.water_tds_ppm} ppm TDS` : undefined });
  if (detail.features?.utilities?.length) facts.push({ icon: 'verified', label: 'Utilities', value: detail.features.utilities.filter((utility) => utility.available).map((utility) => utility.utility_type.replaceAll('_', ' ')).join(' · ') || 'None recorded' });

  return {
    id: property.id,
    title: property.title,
    categoryLabel: categoryLabels[property.category],
    status: {
      label: statusLabel,
      tone: property.status === 'active' ? 'success' : property.status === 'draft' ? 'warning' : 'neutral',
    },
    area: financials?.area != null && financials.area_unit ? { value: financials.area, unit: financials.area_unit } : null,
    location: locationText || null,
    priceInr: financials?.asking_price_inr ?? null,
    description: detail.description ?? undefined,
    facts,
    negotiable: financials?.negotiable,
    minimumPriceInr: financials?.minimum_price_inr,
    advanceAmountInr: financials?.advance_amount_inr,
    outstandingLoanInr: financials?.outstanding_loan_inr,
    legalTitle: detail.legal?.title_classification?.replaceAll('_', ' ') ?? undefined,
    footerLabel: property.status === 'draft' ? `Draft · ${property.completion_percent}% complete` : undefined,
    footerIcon: property.status === 'draft' ? 'schedule' : undefined,
  };
}

export async function listProperties(accessToken: string): Promise<LocalProperty[]> {
  const { data: firstPage } = await apiClient.get<ApiPropertyPage>('/properties', {
    headers: bearer(accessToken),
    params: { limit: 100, offset: 0, sort: 'updated_desc' },
  });
  const summaries = [...firstPage.items];
  for (let offset = firstPage.items.length; offset < firstPage.total; offset += 100) {
    const { data } = await apiClient.get<ApiPropertyPage>('/properties', {
      headers: bearer(accessToken),
      params: { limit: 100, offset, sort: 'updated_desc' },
    });
    summaries.push(...data.items);
  }
  return mapInBatches(summaries, (summary) => loadPropertyCardData(accessToken, summary));
}

// Limit concurrent requests while enriching summaries with fields absent from the list endpoint.
async function mapInBatches<T, U>(items: T[], map: (item: T) => Promise<U>): Promise<U[]> {
  const results: U[] = [];
  for (let index = 0; index < items.length; index += 6) {
    results.push(...await Promise.all(items.slice(index, index + 6).map(map)));
  }
  return results;
}

async function loadPropertyCardData(accessToken: string, summary: ApiPropertySummary): Promise<LocalProperty> {
  const [propertyResult, documentsResult] = await Promise.allSettled([
    getPropertyRecord(accessToken, summary.id),
    getPropertyDocuments(accessToken, summary.id),
  ]);
  const property = propertyResult.status === 'fulfilled'
    ? toLocalProperty(propertyResult.value)
    : toLocalProperty(summary);
  if (documentsResult.status !== 'fulfilled') return property;
  const photos = documentsResult.value.filter((document) => document.category === 'photo' && document.content_type.startsWith('image/'));
  if (!photos.length) return property;
  try {
    const { data } = await apiClient.get<{ download_url: string; expires_in: number }>(
      `/documents/${encodeURIComponent(photos[0].id)}/download-url`,
      { headers: bearer(accessToken) },
    );
    return {
      ...property,
      photoCount: photos.length,
      image: {
        uri: data.download_url,
        accessibilityLabel: photos[0].display_name || photos[0].filename || `${property.title} property photo`,
      },
      photoRefreshAt: Date.now() + Math.max(1, data.expires_in * 0.8) * 1000,
    };
  } catch {
    return { ...property, photoCount: photos.length };
  }
}

async function attachPropertyPhotos(accessToken: string, property: LocalProperty): Promise<LocalProperty> {
  let photos: ApiPropertyDocument[];
  try {
    photos = (await getPropertyDocuments(accessToken, property.id))
      .filter((document) => document.category === 'photo' && document.content_type.startsWith('image/'));
  } catch {
    return property;
  }
  if (!photos.length) return property;

  const photoResults = await Promise.allSettled(photos.map(async (document) => {
    const { data } = await apiClient.get<{ download_url: string; expires_in: number }>(
      `/documents/${encodeURIComponent(document.id)}/download-url`,
      { headers: bearer(accessToken) },
    );
    return {
      photo: {
        uri: data.download_url,
        accessibilityLabel: document.display_name || document.filename || `${property.title} property photo`,
      },
      refreshAt: Date.now() + Math.max(1, data.expires_in * 0.8) * 1000,
    };
  }));
  const loadedPhotos = photoResults.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  if (!loadedPhotos.length) return { ...property, photoCount: photos.length };
  return {
    ...property,
    photoCount: photos.length,
    photos: loadedPhotos.map(({ photo }) => photo),
    image: loadedPhotos[0].photo,
    photoRefreshAt: Math.min(...loadedPhotos.map(({ refreshAt }) => refreshAt)),
  };
}

export async function getProperty(accessToken: string, propertyId: string): Promise<LocalProperty> {
  const property = toLocalProperty(await getPropertyRecord(accessToken, propertyId));
  return attachPropertyPhotos(accessToken, property);
}

export async function getPropertyRecord(accessToken: string, propertyId: string): Promise<ApiProperty> {
  const { data } = await apiClient.get<ApiProperty>(`/properties/${encodeURIComponent(propertyId)}`, {
    headers: bearer(accessToken),
  });
  return data;
}

export async function getPropertyPrivateNotes(accessToken: string, propertyId: string): Promise<string | null> {
  const { data } = await apiClient.get<{ notes: string | null }>(`/properties/${encodeURIComponent(propertyId)}/notes`, {
    headers: bearer(accessToken),
  });
  return data.notes;
}

export async function getPropertyDocuments(accessToken: string, propertyId: string): Promise<ApiPropertyDocument[]> {
  const { data } = await apiClient.get<ApiPropertyDocument[]>(`/properties/${encodeURIComponent(propertyId)}/documents`, { headers: bearer(accessToken) });
  return data;
}

export async function getPropertySigningAuthorities(accessToken: string, propertyId: string): Promise<ApiSigningAuthority[]> {
  const { data } = await apiClient.get<ApiSigningAuthorityList>(`/properties/${encodeURIComponent(propertyId)}/signing-authorities`, { headers: bearer(accessToken) });
  return data.items;
}

export async function replacePropertySigningAuthorities(accessToken: string, propertyId: string, items: ApiSigningAuthorityInput[]): Promise<ApiSigningAuthority[]> {
  const { data } = await apiClient.put<ApiSigningAuthorityList>(`/properties/${encodeURIComponent(propertyId)}/signing-authorities`, { items }, { headers: bearer(accessToken) });
  return data.items;
}

export async function createPropertyUploadUrl(accessToken: string, propertyId: string, input: ApiPropertyUploadRequest): Promise<ApiPropertyUploadResponse> {
  const { data } = await apiClient.post<ApiPropertyUploadResponse>(`/properties/${encodeURIComponent(propertyId)}/uploads/presign`, input, { headers: bearer(accessToken) });
  return data;
}

export async function registerPropertyDocument(accessToken: string, propertyId: string, input: ApiPropertyDocumentCreate): Promise<ApiPropertyDocument> {
  const { data } = await apiClient.post<ApiPropertyDocument>(`/properties/${encodeURIComponent(propertyId)}/documents`, input, { headers: bearer(accessToken) });
  return data;
}

export async function updatePropertyDocument(accessToken: string, documentId: string, input: { visibility?: 'private' | 'shared' | 'public'; display_name?: string | null; category?: ApiDocumentCategory }): Promise<ApiPropertyDocument> {
  const { data } = await apiClient.patch<ApiPropertyDocument>(`/documents/${encodeURIComponent(documentId)}`, input, { headers: bearer(accessToken) });
  return data;
}

export async function preparePropertyAssetsForShare(
  accessToken: string,
  propertyId: string,
  disclosures: Pick<ApiShareDisclosures, 'show_photos' | 'show_documents' | 'show_reports'>,
): Promise<void> {
  const categories = new Set<ApiDocumentCategory>();
  if (disclosures.show_photos) categories.add('photo');
  if (disclosures.show_documents) categories.add('other');
  if (disclosures.show_documents || disclosures.show_reports) {
    categories.add('survey');
    categories.add('soil_report');
  }
  if (!categories.size) return;
  const documents = await getPropertyDocuments(accessToken, propertyId);
  await Promise.all(documents
    .filter((document) => categories.has(document.category) && document.visibility !== 'shared' && document.visibility !== 'public')
    .map((document) => updatePropertyDocument(accessToken, document.id, { visibility: 'shared' })));
}

export async function deletePropertyDocument(accessToken: string, documentId: string): Promise<void> {
  await apiClient.delete(`/documents/${encodeURIComponent(documentId)}`, { headers: bearer(accessToken) });
}

export async function getPropertyDocumentDownloadUrl(accessToken: string, documentId: string): Promise<string> {
  const { data } = await apiClient.get<{ download_url: string; expires_in: number }>(`/documents/${encodeURIComponent(documentId)}/download-url`, { headers: bearer(accessToken) });
  return data.download_url;
}

export async function getDashboard(accessToken: string): Promise<ApiDashboard> {
  const { data } = await apiClient.get<ApiDashboard>('/dashboard', { headers: bearer(accessToken) });
  return data;
}

export async function getBusinessProfile(accessToken: string): Promise<ApiBusinessProfile> {
  try {
    const { data } = await apiClient.get<ApiBusinessProfile>('/profile/business', { headers: bearer(accessToken) });
    return data;
  } catch (error) {
    // New accounts do not have a business_profiles row yet. The current API
    // represents that valid empty state as a 404 with this specific detail.
    if (isAxiosError<{ detail?: unknown }>(error)
      && error.response?.status === 404
      && error.response.data?.detail === 'Business profile not found') {
      return {};
    }
    throw error;
  }
}

export async function getBrokerProfile(accessToken: string): Promise<ApiBrokerProfile> {
  const { data } = await apiClient.get<ApiBrokerProfile>('/profile/broker', { headers: bearer(accessToken) });
  return data;
}

export async function saveBrokerProfile(accessToken: string, profile: ApiBrokerProfile): Promise<ApiBrokerProfile> {
  const { data } = await apiClient.put<ApiBrokerProfile>('/profile/broker', profile, { headers: bearer(accessToken) });
  return data;
}

export async function patchBrokerProfile(accessToken: string, profile: Partial<ApiBrokerProfile>): Promise<ApiBrokerProfile> {
  const { data } = await apiClient.patch<ApiBrokerProfile>('/profile/broker', profile, { headers: bearer(accessToken) });
  return data;
}

export async function saveBusinessProfile(accessToken: string, profile: ApiBusinessProfile): Promise<ApiBusinessProfile> {
  const { data } = await apiClient.put<ApiBusinessProfile>('/profile/business', profile, { headers: bearer(accessToken) });
  return data;
}

export async function getOnboardingStatus(accessToken: string): Promise<ApiOnboardingStatus> {
  const { data } = await apiClient.get<ApiOnboardingStatus>('/profile/onboarding', { headers: bearer(accessToken) });
  return data;
}

export async function saveOnboardingProgress(accessToken: string, progress: Partial<ApiOnboardingStatus>): Promise<ApiOnboardingStatus> {
  const { data } = await apiClient.patch<ApiOnboardingStatus>('/profile/onboarding', progress, { headers: bearer(accessToken) });
  return data;
}

export async function getPreferences(accessToken: string): Promise<ApiPreferences> {
  const { data } = await apiClient.get<ApiPreferences>('/profile/preferences', { headers: bearer(accessToken) });
  return data;
}

export async function savePreferences(accessToken: string, preferences: Partial<ApiPreferences>): Promise<ApiPreferences> {
  const { data } = await apiClient.patch<ApiPreferences>('/profile/preferences', preferences, { headers: bearer(accessToken) });
  return data;
}

export async function getPropertyCategories(accessToken: string): Promise<ApiPropertyCategory[]> {
  const { data } = await apiClient.get<ApiPropertyCategory[]>('/property-categories', { headers: bearer(accessToken) });
  return data;
}

export async function savePropertyCategories(accessToken: string, settings: ApiPropertyCategoryUpdate): Promise<ApiPropertyCategory[]> {
  const { data } = await apiClient.put<ApiPropertyCategory[]>('/profile/preferences/property-categories', settings, { headers: bearer(accessToken) });
  return data;
}

export async function listSharedLinks(accessToken: string): Promise<MockSharedLink[]> {
  const { data: firstPage } = await apiClient.get<ApiPropertyPage>('/properties', {
    headers: bearer(accessToken),
    params: { limit: 100, offset: 0, sort: 'updated_desc' },
  });
  const properties = [...firstPage.items];
  for (let offset = firstPage.items.length; offset < firstPage.total; offset += 100) {
    const { data } = await apiClient.get<ApiPropertyPage>('/properties', {
      headers: bearer(accessToken),
      params: { limit: 100, offset, sort: 'updated_desc' },
    });
    properties.push(...data.items);
  }
  const results = await mapInBatches(properties, async (property) => {
    const links = await getPropertyShareLinks(accessToken, property.id);
    if (!links.length) return [];
    const details = await loadPropertyCardData(accessToken, property);
    return links.map((link) => mapShareLink(link, details));
  });
  const profileLinks = await listProfileShareLinks(accessToken);
  const profileMapped = profileLinks.map((link): MockSharedLink => {
    const revoked = link.revoked_at != null;
    const expired = !revoked && link.expires_at !== null && new Date(link.expires_at).getTime() <= Date.now();
    const location = 'Broker profile';
    return { id: link.id, resourceType: 'profile', includeProfile: link.include_profile, includeProperties: link.include_properties, propertyIds: link.property_ids, propertyDisclosures: link.property_disclosures, title: link.title, propertyName: location, location, status: revoked ? 'revoked' : expired ? 'expired' : 'active', access: link.visibility === 'protected' ? 'Protected' : 'Unlisted', shortUrl: toPublicProfileShareAppUrl(link.public_url), areaLabel: [link.include_profile ? 'Profile details' : '', link.include_properties ? (link.property_ids ? `${link.property_ids.length} selected properties` : 'All active properties') : ''].filter(Boolean).join(' · '), priceLabel: 'Public details', mapLabel: 'Approximate', ownerLabel: 'Broker', documentLabel: 'Portfolio share', createdAt: link.created_at, createdLabel: `Created ${new Date(link.created_at).toLocaleDateString()}`, expiryLabel: revoked ? 'Revoked' : expired ? 'Expired' : link.expires_at ? `Expires ${new Date(link.expires_at).toLocaleDateString()}` : 'No expiration', expiresAt: link.expires_at };
  });
  return [...profileMapped, ...results.flat()];
}

function mapShareLink(link: ApiShareLink, property: LocalProperty): MockSharedLink {
  const revoked = link.revoked_at != null;
  const expired = !revoked && link.expires_at !== null && new Date(link.expires_at).getTime() <= Date.now();
  const url = toPublicListingAppUrl(link.public_url);
  const disclosures = link.disclosures;
  return {
    id: link.id,
    propertyId: property.id,
    title: link.title,
    propertyName: property.title,
    location: property.location || '—',
    status: revoked ? 'revoked' : expired ? 'expired' : 'active',
    access: link.visibility === 'protected' ? 'Protected' : link.visibility === 'private' ? 'Private' : 'Unlisted',
    shortUrl: url,
    areaLabel: formatArea(property.area) ?? '—',
    priceLabel: disclosures.show_price ? property.priceInr != null ? formatInr(property.priceInr) : '—' : 'Hidden',
    mapLabel: disclosures.show_exact_coordinates ? 'Exact pin' : 'Approximate',
    ownerLabel: 'Protected',
    documentLabel: disclosures.show_reports ? 'Reports shared' : disclosures.show_photos ? 'Photos shared' : 'No media shared',
    views: undefined,
    createdAt: link.created_at,
    createdLabel: `Created ${new Date(link.created_at).toLocaleDateString()}`,
    expiryLabel: revoked ? 'Revoked' : expired ? 'Expired' : link.expires_at ? `Expires ${new Date(link.expires_at).toLocaleDateString()}` : 'No expiration',
    imageUri: property.image?.uri,
    photoRefreshAt: property.photoRefreshAt,
    expiresAt: link.expires_at,
    disclosures,
  };
}

export function photoRefreshInterval(items: { photoRefreshAt?: number }[] | undefined): number | false {
  const times = items?.flatMap((item) => item.photoRefreshAt == null ? [] : [item.photoRefreshAt]) ?? [];
  return times.length ? Math.max(1000, Math.min(...times) - Date.now()) : false;
}
