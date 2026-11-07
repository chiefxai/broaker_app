import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import type MockAdapter from 'axios-mock-adapter';

import { archiveProperty, createProfileShareLink, createPropertyDraft, createPropertyShareLink, createPropertyUploadUrl, deleteProperty, deletePropertyDocument, deletePropertyShareLink, getBrokerProfile, getBusinessProfile, getOnboardingStatus, getPreferences, getProperty, getPropertyCategories, getPropertyDocumentDownloadUrl, getPropertyDocuments, getPropertyPrivateNotes, getPropertyRecord, getPropertyShareLinks, getPropertySigningAuthorities, getPublicListing, getPublicProfileShare, listProfileShareLinks, listProperties, listSharedLinks, patchBrokerProfile, patchProperty, photoRefreshInterval, preparePropertyAssetsForShare, publishProperty, registerPropertyDocument, replacePropertySigningAuthorities, revokeProfileShareLink, saveBrokerProfile, saveBusinessProfile, saveOnboardingProgress, savePreferences, savePropertyCategories, savePropertyFeatures, savePropertyFinancials, savePropertyLegal, savePropertyLocation, savePropertyPrivateNotes, toLocalProperty, toPublicProfileShareAppUrl, updateProfileShareLink, updatePropertyDocument, updatePropertyShareLink } from '@/api/backend-api';
import { accessTokenFixture, signingAuthorityInputFixture, signingAuthorityResponseFixture } from './fixtures/api';
import { createApiMock } from './utils/mock-api';

const summary = {
  id: 'd4c4ab58-3095-4d08-b2f7-534488ab89b0',
  title: 'Tamarind Grove',
  category: 'agriculture' as const,
  status: 'draft' as const,
  completion_percent: 40,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-02T10:00:00Z',
};

describe('backend API data adapters', () => {
  let mock: MockAdapter;

  beforeAll(() => { mock = createApiMock(); });
  beforeEach(() => mock.reset());
  afterAll(() => mock.restore());

  it('lists backend properties with the access token and contract pagination', async () => {
    mock.onGet('/properties').reply(200, { items: [summary], limit: 100, offset: 0, total: 1 });
    mock.onGet(`/properties/${summary.id}`).reply(200, { ...summary, location: { district: 'Tirunelveli' }, financials: { area: 150, area_unit: 'cent', asking_price_inr: 2400000 } });
    mock.onGet(`/properties/${summary.id}/documents`).reply(200, [
      { id: 'photo-id', object_key: 'photo', filename: 'photo.jpg', content_type: 'image/jpeg', category: 'photo', created_at: summary.created_at },
      { id: 'photo-id-2', object_key: 'photo-2', filename: 'field.jpg', content_type: 'image/jpeg', category: 'photo', created_at: summary.created_at },
    ]);
    mock.onGet('/documents/photo-id/download-url').reply(200, { download_url: 'https://files.example.test/photo?temporary=1', expires_in: 300 });
    mock.onGet('/documents/photo-id-2/download-url').reply(200, { download_url: 'https://files.example.test/field?temporary=1', expires_in: 300 });

    await expect(listProperties(accessTokenFixture)).resolves.toEqual([expect.objectContaining({
      id: summary.id,
      title: 'Tamarind Grove',
      categoryLabel: 'Agriculture Land',
      status: { label: 'Draft', tone: 'warning' },
      footerLabel: 'Draft · 40% complete',
      location: 'Tirunelveli', priceInr: 2400000, area: { value: 150, unit: 'cent' }, photoCount: 2,
      image: { uri: 'https://files.example.test/photo?temporary=1', accessibilityLabel: 'photo.jpg' },
    })]);
    expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(mock.history.get[0].params).toEqual({ limit: 100, offset: 0, sort: 'updated_desc' });
  });

  it('keeps a property visible if its details or photo cannot be loaded', async () => {
    mock.onGet('/properties').reply(200, { items: [summary], limit: 100, offset: 0, total: 1 });
    mock.onGet(`/properties/${summary.id}`).reply(503);
    mock.onGet(`/properties/${summary.id}/documents`).reply(503);
    await expect(listProperties(accessTokenFixture)).resolves.toEqual([expect.objectContaining({ title: summary.title, location: null, priceInr: null })]);
  });

  it('schedules temporary photos for refresh before they expire', () => {
    expect(photoRefreshInterval([])).toBe(false);
    const now = Date.now();
    expect(photoRefreshInterval([{ photoRefreshAt: now + 10000 }, { photoRefreshAt: now + 5000 }])).toBeGreaterThan(3000);
    expect(photoRefreshInterval([{ photoRefreshAt: now + 10000 }, { photoRefreshAt: now + 5000 }])).toBeLessThanOrEqual(5000);
  });

  it('maps property detail financials and location from the backend schema', () => {
    const property = toLocalProperty({
      ...summary,
      status: 'active',
      description: 'Farm with well access.',
      location: { village: 'Vagaikulam', district: 'Tirunelveli', state: 'Tamil Nadu', road_access_type: 'Tar road' },
      financials: { asking_price_inr: 2_400_000, area: 150, area_unit: 'cent' },
    });

    expect(property).toMatchObject({
      location: 'Vagaikulam, Tirunelveli, Tamil Nadu',
      priceInr: 2_400_000,
      area: { value: 150, unit: 'cent' },
      status: { label: 'Active', tone: 'success' },
      description: 'Farm with well access.',
    });
    expect(property.facts?.map(({ label }) => label)).toContain('Road access');
  });

  it('loads a full property record and private notes for the six-step editor', async () => {
    const record = { ...summary, description: 'Saved details', location: { village: 'Vagaikulam' }, features: { soil_type: 'black' as const }, financials: { asking_price_inr: 3_600_000 }, legal: { title_classification: 'natham' as const } };
    mock.onGet(`/properties/${summary.id}`).reply(200, record);
    mock.onGet(`/properties/${summary.id}/notes`).reply(200, { notes: 'Keep private' });

    await expect(getPropertyRecord(accessTokenFixture, summary.id)).resolves.toEqual(record);
    await expect(getPropertyPrivateNotes(accessTokenFixture, summary.id)).resolves.toBe('Keep private');
    expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(mock.history.get[1].url).toBe(`/properties/${summary.id}/notes`);
  });

  it('loads all image media for the property details gallery', async () => {
    mock.onGet(`/properties/${summary.id}`).reply(200, { ...summary, status: 'active' });
    mock.onGet(`/properties/${summary.id}/documents`).reply(200, [
      { id: 'photo-id', object_key: 'photo', filename: 'entrance.jpg', content_type: 'image/jpeg', category: 'photo', created_at: summary.created_at },
      { id: 'photo-id-2', object_key: 'photo-2', filename: 'field.jpg', content_type: 'image/jpeg', category: 'photo', created_at: summary.created_at },
      { id: 'report-id', object_key: 'report', filename: 'survey.pdf', content_type: 'application/pdf', category: 'survey', created_at: summary.created_at },
    ]);
    mock.onGet('/documents/photo-id/download-url').reply(200, { download_url: 'https://files.example.test/entrance', expires_in: 300 });
    mock.onGet('/documents/photo-id-2/download-url').reply(200, { download_url: 'https://files.example.test/field', expires_in: 300 });

    await expect(getProperty(accessTokenFixture, summary.id)).resolves.toMatchObject({
      photoCount: 2,
      photos: [
        { uri: 'https://files.example.test/entrance', accessibilityLabel: 'entrance.jpg' },
        { uri: 'https://files.example.test/field', accessibilityLabel: 'field.jpg' },
      ],
      image: { uri: 'https://files.example.test/entrance' },
    });
  });

  it('loads a property detail with an access-token header', async () => {
    mock.onGet(`/properties/${summary.id}`).reply(200, summary);
    await getProperty(accessTokenFixture, summary.id);
    expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
  });

  it('deletes drafts and archives active properties using the contract routes', async () => {
    mock.onDelete(`/properties/${summary.id}`).reply(204);
    mock.onPost(`/properties/${summary.id}/archive`).reply(200, { ...summary, status: 'archived' });
    await expect(deleteProperty(accessTokenFixture, summary.id)).resolves.toBeUndefined();
    await expect(archiveProperty(accessTokenFixture, summary.id)).resolves.toMatchObject({ status: 'archived' });
    expect(mock.history.delete[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(mock.history.post[0].url).toBe(`/properties/${summary.id}/archive`);
  });

  it('saves each implemented property wizard section with the bearer access token', async () => {
    const location = { village: 'Ambasamudram', survey_numbers: ['248/1A'], latitude: 8.7139, longitude: 77.7567, frontage_direction: 'East', road_access_type: 'tar_road', road_width_ft: 30, road_subdivision_basis: 'government_subdivision', highway_distance_km: 0 };
    const features = { soil_type: 'red' as const, water_sources: [{ source_type: 'borewell' as const }], utilities: [{ utility_type: 'fencing' as const, available: true }] };
    const financials = { currency: 'INR' as const, area: 150, area_unit: 'cent', asking_price_inr: 3_600_000 };
    const legal = { title_classification: 'ryotwari_patta' as const, legal_summary: 'Clear title' };
    const property = { ...summary, description: 'Farm', location, features, financials, legal };
    mock.onPost('/properties').reply(201, summary);
    mock.onPatch(`/properties/${summary.id}`).reply(200, property);
    mock.onPut(`/properties/${summary.id}/location`).reply(200, location);
    mock.onPut(`/properties/${summary.id}/features`).reply(200, features);
    mock.onPut(`/properties/${summary.id}/financials`).reply(200, financials);
    mock.onPut(`/properties/${summary.id}/legal`).reply(200, legal);
    mock.onPut(`/properties/${summary.id}/notes`).reply(200, { notes: 'Private field note' });
    mock.onPost(`/properties/${summary.id}/publish`).reply(200, property);

    await expect(createPropertyDraft(accessTokenFixture, { title: summary.title, category: summary.category })).resolves.toEqual(summary);
    await expect(patchProperty(accessTokenFixture, summary.id, { description: 'Farm' })).resolves.toMatchObject({ id: summary.id });
    await expect(savePropertyLocation(accessTokenFixture, summary.id, location)).resolves.toEqual(location);
    await expect(savePropertyFeatures(accessTokenFixture, summary.id, features)).resolves.toEqual(features);
    await expect(savePropertyFinancials(accessTokenFixture, summary.id, financials)).resolves.toEqual(financials);
    await expect(savePropertyLegal(accessTokenFixture, summary.id, legal)).resolves.toEqual(legal);
    await expect(savePropertyPrivateNotes(accessTokenFixture, summary.id, 'Private field note')).resolves.toBeUndefined();
    await expect(publishProperty(accessTokenFixture, summary.id)).resolves.toMatchObject({ id: summary.id });

    expect(mock.history.post.every((request) => request.headers?.Authorization === `Bearer ${accessTokenFixture}`)).toBe(true);
    expect(mock.history.patch[0].data).toBe(JSON.stringify({ description: 'Farm' }));
    expect(mock.history.put.find((request) => request.url?.endsWith('/notes'))?.data).toBe(JSON.stringify({ notes: 'Private field note' }));
  });

  it('loads property documents and requests an authorized short-lived download URL', async () => {
    const documentId = 'f97a3c46-4688-41e3-b194-b400e2e4c0d4';
    mock.onGet(`/properties/${summary.id}/documents`).reply(200, [{ id: documentId, object_key: 'user/property/fmb.pdf', filename: 'fmb.pdf', content_type: 'application/pdf', category: 'survey', display_name: 'FMB Boundary Map', created_at: '2026-10-02T10:00:00Z' }]);
    mock.onGet(`/documents/${documentId}/download-url`).reply(200, { download_url: 'https://files.example.test/fmb.pdf?token=temporary', expires_in: 300 });

    await expect(getPropertyDocuments(accessTokenFixture, summary.id)).resolves.toEqual([expect.objectContaining({ id: documentId, display_name: 'FMB Boundary Map' })]);
    await expect(getPropertyDocumentDownloadUrl(accessTokenFixture, documentId)).resolves.toBe('https://files.example.test/fmb.pdf?token=temporary');
    expect(mock.history.get.every((request) => request.headers?.Authorization === `Bearer ${accessTokenFixture}`)).toBe(true);
  });

  it('shares photo and selected field document assets when enabling link disclosures', async () => {
    const documents = [
      { id: 'photo-id', category: 'photo', visibility: 'private' },
      { id: 'report-id', category: 'survey', visibility: 'private' },
      { id: 'other-id', category: 'other', visibility: 'private' },
      { id: 'deed-id', category: 'title_deed', visibility: 'private' },
    ];
    mock.onGet(`/properties/${summary.id}/documents`).reply(200, documents);
    mock.onPatch('/documents/photo-id').reply(200, {});
    mock.onPatch('/documents/report-id').reply(200, {});
    mock.onPatch('/documents/other-id').reply(200, {});

    await preparePropertyAssetsForShare(accessTokenFixture, summary.id, {
      show_photos: true,
      show_documents: true,
      show_reports: false,
    });

    expect(mock.history.patch.map((request) => request.url)).toEqual([
      '/documents/photo-id', '/documents/report-id', '/documents/other-id',
    ]);
    expect(mock.history.patch.every((request) => request.data === '{"visibility":"shared"}')).toBe(true);
  });

  it('creates presigned uploads, registers document metadata, and deletes by document id', async () => {
    const documentId = 'f97a3c46-4688-41e3-b194-b400e2e4c0d4';
    const presign = { upload_url: 'https://storage.example.test/upload?signature=temporary', object_key: 'user/property/title.pdf', method: 'PUT' as const, expires_in: 300, content_type: 'application/pdf' };
    const document = { id: documentId, object_key: presign.object_key, filename: 'title.pdf', content_type: presign.content_type, category: 'other' as const, display_name: null, created_at: '2026-10-02T10:00:00Z' };
    mock.onPost(`/properties/${summary.id}/uploads/presign`).reply(201, presign);
    mock.onPost(`/properties/${summary.id}/documents`).reply(201, document);
    mock.onPatch(`/documents/${documentId}`).reply(200, { ...document, visibility: 'shared' });
    mock.onDelete(`/documents/${documentId}`).reply(204);

    await expect(createPropertyUploadUrl(accessTokenFixture, summary.id, { filename: 'title.pdf', content_type: 'application/pdf' })).resolves.toEqual(presign);
    await expect(registerPropertyDocument(accessTokenFixture, summary.id, { object_key: presign.object_key, filename: 'title.pdf', content_type: 'application/pdf', category: 'other', display_name: null })).resolves.toEqual(document);
    await expect(updatePropertyDocument(accessTokenFixture, documentId, { visibility: 'shared' })).resolves.toMatchObject({ id: documentId, visibility: 'shared' });
    await expect(deletePropertyDocument(accessTokenFixture, documentId)).resolves.toBeUndefined();
    expect(mock.history.post.every((request) => request.headers?.Authorization === `Bearer ${accessTokenFixture}`)).toBe(true);
    expect(mock.history.post[0].data).toBe(JSON.stringify({ filename: 'title.pdf', content_type: 'application/pdf' }));
    expect(mock.history.post[1].data).toBe(JSON.stringify({ object_key: presign.object_key, filename: 'title.pdf', content_type: 'application/pdf', category: 'other', display_name: null }));
    expect(mock.history.patch[0].data).toBe(JSON.stringify({ visibility: 'shared' }));
    expect(mock.history.patch[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(mock.history.delete[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
  });

  it('requests a presigned URL for a voice log with the audio MIME type and matching extension', async () => {
    const propertyId = summary.id;
    const presign = {
      upload_url: 'https://storage.example.test/upload?signature=voice',
      object_key: 'users/test/properties/property/documents/voice.m4a',
      method: 'PUT' as const,
      expires_in: 300,
      content_type: 'audio/mp4' as const,
    };
    mock.onPost(`/properties/${propertyId}/uploads/presign`).reply(201, presign);

    await expect(createPropertyUploadUrl(accessTokenFixture, propertyId, {
      filename: 'field-voice-log-test.m4a',
      content_type: 'audio/mp4',
    })).resolves.toEqual(presign);
    expect(mock.history.post[0].data).toBe(JSON.stringify({ filename: 'field-voice-log-test.m4a', content_type: 'audio/mp4' }));
    expect(mock.history.post[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
  });

  it('loads and replaces signing authorities using the private property routes and access token', async () => {
    const propertyId = summary.id;
    mock.onGet(`/properties/${propertyId}/signing-authorities`).reply(200, { items: [signingAuthorityResponseFixture] });
    mock.onPut(`/properties/${propertyId}/signing-authorities`).reply(200, { items: [signingAuthorityResponseFixture] });

    await expect(getPropertySigningAuthorities(accessTokenFixture, propertyId)).resolves.toEqual([signingAuthorityResponseFixture]);
    await expect(replacePropertySigningAuthorities(accessTokenFixture, propertyId, [signingAuthorityInputFixture])).resolves.toEqual([signingAuthorityResponseFixture]);
    expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(mock.history.put[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(JSON.parse(mock.history.put[0].data as string)).toEqual({ items: [signingAuthorityInputFixture] });
  });

  it('lists, creates, updates, and revokes property share links with contract disclosures', async () => {
    const shareLinkId = 'b8f61ecb-778a-47cb-a818-8ece93b67828';
    const disclosures = { show_price: true, show_exact_coordinates: false, show_photos: true, show_reports: false, show_approach_roads: true };
    const link = { id: shareLinkId, title: 'Riverside public preview', expires_at: null, disclosures, public_url: 'https://estateflow.test/p/demo-token', created_at: '2026-11-03T10:00:00Z' };
    mock.onGet(`/properties/${summary.id}/share-links`).reply(200, { items: [link], limit: 100, offset: 0, total: 1 });
    mock.onPost(`/properties/${summary.id}/share-links`).reply(201, link);
    mock.onPatch(`/share-links/${shareLinkId}`).reply(200, link);
    mock.onDelete(`/share-links/${shareLinkId}`).reply(204);
    const input = { title: link.title, expires_at: null, disclosures };

    await expect(getPropertyShareLinks(accessTokenFixture, summary.id)).resolves.toEqual([link]);
    await expect(createPropertyShareLink(accessTokenFixture, summary.id, input)).resolves.toEqual(link);
    const edit = { title: 'Updated preview', expires_at: '2026-12-03T23:59:59Z', disclosures: { ...disclosures, show_price: false } };
    await expect(updatePropertyShareLink(accessTokenFixture, shareLinkId, edit)).resolves.toEqual(link);
    await expect(deletePropertyShareLink(accessTokenFixture, shareLinkId)).resolves.toBeUndefined();
    expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(mock.history.post[0].data).toBe(JSON.stringify(input));
    expect(mock.history.patch[0].data).toBe(JSON.stringify(edit));
    expect(mock.history.delete[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
  });

  it('creates, lists, views, and revokes a profile link that can include profile and portfolio data', async () => {
    const id = 'f4ab1472-e987-4d32-a7e1-31e8ef8a830e';
    const propertyIds = [summary.id, '9c0422bf-b8d8-43f8-a91c-ec94b47d10c6'];
    const link = { id, title: 'Broker profile & portfolio', include_profile: true, include_properties: true, property_ids: propertyIds, visibility: 'unlisted' as const, public_url: 'https://api.example.test/api/v1/public/profiles/profile-token', expires_at: null, revoked_at: null, created_at: summary.created_at };
    const input = { title: link.title, include_profile: true, include_properties: true, property_ids: propertyIds, visibility: 'unlisted' as const, expires_at: null };
    const publicData = { profile: { business_name: 'EstateFlow Realty', public_email: 'hello@example.test' }, properties: [{ public_listing_token: 'profile-token~property-id', title: 'Green Valley Farm', category: 'agriculture', area: 92, area_unit: 'acre' }] };
    mock.onPost('/profile/share-links').reply(201, link);
    mock.onGet('/profile/share-links').reply(200, { items: [link], limit: 100, offset: 0, total: 1 });
    mock.onGet('/public/profiles/profile-token').reply(200, publicData);
    mock.onPatch(`/profile/share-links/${id}`).reply(200, { ...link, title: 'Updated profile', include_profile: false });
    mock.onDelete(`/profile/share-links/${id}`).reply(204);

    await expect(createProfileShareLink(accessTokenFixture, input)).resolves.toEqual(link);
    await expect(listProfileShareLinks(accessTokenFixture)).resolves.toEqual([link]);
    await expect(getPublicProfileShare('profile-token')).resolves.toEqual(publicData);
    await expect(updateProfileShareLink(accessTokenFixture, id, { title: 'Updated profile', include_profile: false })).resolves.toEqual({ ...link, title: 'Updated profile', include_profile: false });
    await expect(revokeProfileShareLink(accessTokenFixture, id)).resolves.toBeUndefined();
    expect(mock.history.post[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(JSON.parse(mock.history.post[0].data as string)).toMatchObject({ property_ids: propertyIds });
    expect(mock.history.patch[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(JSON.parse(mock.history.patch[0].data as string)).toEqual({ title: 'Updated profile', include_profile: false });
    expect(mock.history.delete[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    const oldAppUrl = process.env.EXPO_PUBLIC_PUBLIC_APP_URL;
    process.env.EXPO_PUBLIC_PUBLIC_APP_URL = 'https://broaker.example.test';
    try { expect(toPublicProfileShareAppUrl(link.public_url)).toBe('https://broaker.example.test/broker/profile-token'); }
    finally {
      if (oldAppUrl === undefined) delete process.env.EXPO_PUBLIC_PUBLIC_APP_URL;
      else process.env.EXPO_PUBLIC_PUBLIC_APP_URL = oldAppUrl;
    }
  });

  it('sends protected profile share passcodes in the dedicated header', async () => {
    mock.onGet('/public/profiles/protected-token').reply(200, { profile: null, properties: [] });
    await getPublicProfileShare('protected-token', '123456');
    expect(mock.history.get[0].headers?.['X-Share-Passcode']).toBe('123456');
  });

  it('follows contract pagination when a property has more than one page of links', async () => {
    const first = { id: 'link-1', title: 'One', expires_at: null, disclosures: {}, public_url: null, created_at: summary.created_at };
    const second = { ...first, id: 'link-2', title: 'Two' };
    mock.onGet(`/properties/${summary.id}/share-links`).reply((config) => config.params?.offset === 0
      ? [200, { items: [first], limit: 1, offset: 0, total: 2 }]
      : [200, { items: [second], limit: 1, offset: 1, total: 2 }]);

    await expect(getPropertyShareLinks(accessTokenFixture, summary.id)).resolves.toEqual([first, second]);
    expect(mock.history.get.map((request) => request.params?.offset)).toEqual([0, 1]);
  });

  it('loads anonymous public listing data without attaching a broker access token', async () => {
    const listing = { title: 'Riverside Farm', description: null, category: 'agriculture', media: [], reports: [] };
    mock.onGet('/public/listings/public-token').reply(200, listing);
    mock.onGet('/public/listings/protected-token').reply(200, listing);
    mock.onGet('/public/listings/private-token').reply(200, listing);

    await expect(getPublicListing('public-token')).resolves.toEqual(listing);
    expect(mock.history.get[0].headers?.Authorization).toBeUndefined();
    await expect(getPublicListing('protected-token', '123456')).resolves.toEqual(listing);
    expect(mock.history.get[1].headers?.['X-Share-Passcode']).toBe('123456');
    await expect(getPublicListing('private-token', undefined, accessTokenFixture)).resolves.toEqual(listing);
    expect(mock.history.get[2].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
  });

  it('reads and writes settings using only fields defined in the API contract', async () => {
    const profile = { business_name: 'Vance Realty', public_phone: '+91 98765 43210', public_email: 'hello@example.test', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu' };
    const broker = { legal_name: 'Marcus Vance', mobile_phone: null, operating_language: 'en', designation: null, license_number: null, license_jurisdiction: null };
    const disclosures = { show_price: false, show_exact_coordinates: false, show_photos: true, show_reports: false, show_approach_roads: false };
    const categoryItems = [
      { code: 'agriculture' as const, label: 'Agriculture Land', sort_order: 0, enabled: true },
      { code: 'plots' as const, label: 'Plots', sort_order: 1, enabled: false },
    ];
    mock.onGet('/profile/broker').reply(200, broker);
    mock.onPut('/profile/broker').reply(200, broker);
    mock.onPatch('/profile/broker').reply(200, broker);
    mock.onGet('/profile/business').reply(200, profile);
    mock.onPut('/profile/business').reply(200, profile);
    mock.onGet('/profile/preferences').reply(200, { language: 'en', theme: 'light', default_disclosures: disclosures, default_expiration_days: 7 });
    mock.onPatch('/profile/preferences').reply(200, { language: 'en', theme: 'light', default_disclosures: disclosures, default_expiration_days: 30 });
    mock.onGet('/property-categories').reply(200, categoryItems);
    mock.onPut('/profile/preferences/property-categories').reply(200, categoryItems);

    await expect(getBrokerProfile(accessTokenFixture)).resolves.toEqual(broker);
    await expect(saveBrokerProfile(accessTokenFixture, broker)).resolves.toEqual(broker);
    await expect(patchBrokerProfile(accessTokenFixture, { legal_name: 'Updated Name' })).resolves.toEqual(broker);
    await expect(getBusinessProfile(accessTokenFixture)).resolves.toEqual(profile);
    await expect(saveBusinessProfile(accessTokenFixture, profile)).resolves.toEqual(profile);
    await expect(getPreferences(accessTokenFixture)).resolves.toMatchObject({ default_disclosures: disclosures, default_expiration_days: 7 });
    await expect(savePreferences(accessTokenFixture, { default_disclosures: disclosures })).resolves.toMatchObject({ default_disclosures: disclosures });
    await expect(savePreferences(accessTokenFixture, { default_expiration_days: 30 })).resolves.toMatchObject({ default_expiration_days: 30 });
    expect(mock.history.patch.filter((request) => request.url === '/profile/preferences').slice(-1)[0]?.data).toBe(JSON.stringify({ default_expiration_days: 30 }));
    await expect(getPropertyCategories(accessTokenFixture)).resolves.toEqual(categoryItems);
    await expect(savePropertyCategories(accessTokenFixture, { items: categoryItems.map(({ code, sort_order, enabled }) => ({ code, sort_order, enabled })) })).resolves.toEqual(categoryItems);

    expect(mock.history.put.find((request) => request.url === '/profile/business')?.headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(mock.history.put.find((request) => request.url === '/profile/broker')?.headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(mock.history.patch.find((request) => request.url === '/profile/broker')?.data).toBe(JSON.stringify({ legal_name: 'Updated Name' }));
    expect(mock.history.patch.find((request) => request.url === '/profile/preferences')?.data).toContain('default_disclosures');
    expect(JSON.parse(mock.history.put.find((request) => request.url === '/profile/preferences/property-categories')?.data as string)).toEqual({ items: [{ code: 'agriculture', sort_order: 0, enabled: true }, { code: 'plots', sort_order: 1, enabled: false }] });
  });

  it('treats a missing business profile as an empty profile and preserves other API errors', async () => {
    mock.onGet('/profile/business').reply(404, { detail: 'Business profile not found' });
    await expect(getBusinessProfile(accessTokenFixture)).resolves.toEqual({});

    mock.onGet('/profile/business').reply(404, { detail: 'Account not found' });
    await expect(getBusinessProfile(accessTokenFixture)).rejects.toMatchObject({ response: { status: 404 } });
  });

  it('reads onboarding status and saves completion with the access token', async () => {
    const status = { completed: false, current_step: 'profile', completed_steps: [] };
    const completed = { completed: true, current_step: 'complete', completed_steps: ['profile', 'business', 'complete'] };
    mock.onGet('/profile/onboarding').reply(200, status);
    mock.onPatch('/profile/onboarding').reply(200, completed);

    await expect(getOnboardingStatus(accessTokenFixture)).resolves.toEqual(status);
    await expect(saveOnboardingProgress(accessTokenFixture, { current_step: 'complete', completed_steps: completed.completed_steps })).resolves.toEqual(completed);
    expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(mock.history.patch[0].headers?.Authorization).toBe(`Bearer ${accessTokenFixture}`);
    expect(JSON.parse(mock.history.patch[0].data as string)).toEqual({ current_step: 'complete', completed_steps: completed.completed_steps });
  });

  it('loads shared links through each accessible property and preserves the returned URL', async () => {
    mock.onGet('/profile/share-links').reply(200, { items: [], limit: 100, offset: 0, total: 0 });
    mock.onGet('/properties').reply(200, { items: [summary], limit: 100, offset: 0, total: 1 });
    mock.onGet(`/properties/${summary.id}`).reply(200, { ...summary, location: { district: 'Tirunelveli' }, financials: { area: 150, area_unit: 'cent', asking_price_inr: 2400000 } });
    mock.onGet(`/properties/${summary.id}/documents`).reply(200, []);
    mock.onGet(`/properties/${summary.id}/share-links`).reply(200, { items: [{
      id: '2e2e5a52-9387-4fb2-9b06-bebc88d6b1f2',
      title: 'Buyer brochure',
      expires_at: null,
      disclosures: { show_price: true, show_exact_coordinates: false, show_photos: true, show_reports: false, show_approach_roads: false },
      public_url: 'http://localhost:3000/public/listings/secure-token',
      created_at: '2026-10-01T10:00:00Z',
    }, {
      id: 'ab7a8bf2-190e-442a-9aeb-975c4cd62c28', title: 'Revoked old link', expires_at: null,
      revoked_at: '2026-10-02T10:00:00Z', disclosures: { show_price: true, show_exact_coordinates: false, show_photos: true, show_reports: false, show_approach_roads: false },
      public_url: null, created_at: '2026-09-01T10:00:00Z',
    }], limit: 100, offset: 0, total: 2 });

    const previousPublicAppUrl = process.env.EXPO_PUBLIC_PUBLIC_APP_URL;
    process.env.EXPO_PUBLIC_PUBLIC_APP_URL = 'https://broaker.example.test';
    let links: Awaited<ReturnType<typeof listSharedLinks>>;
    try { links = await listSharedLinks(accessTokenFixture); }
    finally {
      if (previousPublicAppUrl === undefined) delete process.env.EXPO_PUBLIC_PUBLIC_APP_URL;
      else process.env.EXPO_PUBLIC_PUBLIC_APP_URL = previousPublicAppUrl;
    }
    expect(links).toEqual([expect.objectContaining({
      id: '2e2e5a52-9387-4fb2-9b06-bebc88d6b1f2',
      propertyName: 'Tamarind Grove',
      shortUrl: 'https://broaker.example.test/share/secure-token',
      priceLabel: '₹24,00,000',
      location: 'Tirunelveli', areaLabel: '150 cent', views: undefined,
      mapLabel: 'Approximate',
      status: 'active',
    }), expect.objectContaining({ id: 'ab7a8bf2-190e-442a-9aeb-975c4cd62c28', status: 'revoked', expiryLabel: 'Revoked' })]);
    expect(mock.history.get.every((request) => request.headers?.Authorization === `Bearer ${accessTokenFixture}`)).toBe(true);
  });
});
