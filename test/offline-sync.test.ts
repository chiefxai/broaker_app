import type { SQLiteDatabase } from 'expo-sqlite';
import type { LocalProperty } from '@/data/mock/properties';
import type { LocalPropertyAsset } from '@/data/database/property-repository';
import { propertyWizardDraftFixture } from './fixtures/property-wizard';

const mockCreatePropertyDraft = jest.fn();
const mockPatchProperty = jest.fn();
const mockSavePropertyLocation = jest.fn();
const mockSavePropertyFeatures = jest.fn();
const mockSavePropertyFinancials = jest.fn();
const mockSavePropertyLegal = jest.fn();
const mockSavePropertyPrivateNotes = jest.fn();
const mockCreatePropertyUploadUrl = jest.fn();
const mockRegisterPropertyDocument = jest.fn();
const mockUpdatePropertyDocument = jest.fn();
const mockPublishProperty = jest.fn();
const mockUpload = jest.fn();
const mockListPending = jest.fn();
const mockListAssets = jest.fn();
const mockUpdateSync = jest.fn();
const mockUpdateAsset = jest.fn();
const mockUpdatePublished = jest.fn();

jest.mock('@/api/backend-api', () => ({
  createPropertyDraft: (...args: unknown[]) => mockCreatePropertyDraft(...args),
  patchProperty: (...args: unknown[]) => mockPatchProperty(...args),
  savePropertyLocation: (...args: unknown[]) => mockSavePropertyLocation(...args),
  savePropertyFeatures: (...args: unknown[]) => mockSavePropertyFeatures(...args),
  savePropertyFinancials: (...args: unknown[]) => mockSavePropertyFinancials(...args),
  savePropertyLegal: (...args: unknown[]) => mockSavePropertyLegal(...args),
  savePropertyPrivateNotes: (...args: unknown[]) => mockSavePropertyPrivateNotes(...args),
  createPropertyUploadUrl: (...args: unknown[]) => mockCreatePropertyUploadUrl(...args),
  registerPropertyDocument: (...args: unknown[]) => mockRegisterPropertyDocument(...args),
  updatePropertyDocument: (...args: unknown[]) => mockUpdatePropertyDocument(...args),
  publishProperty: (...args: unknown[]) => mockPublishProperty(...args),
}));
jest.mock('@/api/presigned-upload', () => ({ uploadRawFileToPresignedUrl: (...args: unknown[]) => mockUpload(...args) }));
jest.mock('@/data/database/property-repository', () => ({
  listPendingLocalProperties: (...args: unknown[]) => mockListPending(...args),
  listLocalPropertyAssets: (...args: unknown[]) => mockListAssets(...args),
  updateLocalPropertySync: (...args: unknown[]) => mockUpdateSync(...args),
  updateLocalPropertyAsset: (...args: unknown[]) => mockUpdateAsset(...args),
  updateLocalPropertyPublished: (...args: unknown[]) => mockUpdatePublished(...args),
}));
jest.mock('expo-file-system', () => ({ File: jest.fn().mockImplementation((uri: string) => ({ uri })) }));

import { syncPendingLocalProperties } from '@/data/database/offline-sync';

describe('offline property sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePropertyDraft.mockResolvedValue({ id: 'remote-property-1' });
    mockPatchProperty.mockResolvedValue({});
    mockSavePropertyLocation.mockResolvedValue({});
    mockSavePropertyFeatures.mockResolvedValue({});
    mockSavePropertyFinancials.mockResolvedValue({});
    mockSavePropertyLegal.mockResolvedValue({});
    mockSavePropertyPrivateNotes.mockResolvedValue({});
    mockCreatePropertyUploadUrl.mockResolvedValue({ upload_url: 'https://upload.example', object_key: 'assets/photo.jpg', content_type: 'image/jpeg' });
    mockUpload.mockResolvedValue(undefined);
    mockRegisterPropertyDocument.mockResolvedValue({ id: 'remote-document-1' });
    mockUpdatePropertyDocument.mockResolvedValue({});
    mockPublishProperty.mockResolvedValue({});
    mockListPending.mockResolvedValue([]);
    mockListAssets.mockResolvedValue([]);
  });

  it('creates and syncs a saved property plus its queued media when connectivity returns', async () => {
    const property = {
      id: 'local-property-1', title: propertyWizardDraftFixture.title, category: 'agriculture',
      status: { label: 'Draft', tone: 'neutral' }, remoteId: null, ownerSub: 'owner-1',
      syncStatus: 'pending', offlineStep: 4,
      offlineDraft: { draft: propertyWizardDraftFixture, loanActive: false, irrigationMethod: null },
    } as unknown as LocalProperty;
    const photo: LocalPropertyAsset = {
      id: 'local-photo-1', property_id: property.id, local_uri: 'file:///photo.jpg', filename: 'photo.jpg', content_type: 'image/jpeg',
      category: 'photo', display_name: 'Frontage', visibility: 'shared', status: 'pending', remote_document_id: null, sync_error: null, created_at: '2026-11-06T00:00:00Z',
    };
    mockListPending.mockResolvedValue([property]);
    mockListAssets.mockResolvedValue([photo]);
    const db = {} as SQLiteDatabase;

    await expect(syncPendingLocalProperties(db, 'access-token', 'owner-1')).resolves.toEqual({ synced: 1, errors: [] });

    expect(mockCreatePropertyDraft).toHaveBeenCalledWith('access-token', { title: propertyWizardDraftFixture.title, category: propertyWizardDraftFixture.category });
    expect(mockSavePropertyLocation).toHaveBeenCalledWith('access-token', 'remote-property-1', expect.objectContaining({ pincode: null, latitude: 8.7139 }));
    expect(mockCreatePropertyUploadUrl).toHaveBeenCalledWith('access-token', 'remote-property-1', { filename: 'photo.jpg', content_type: 'image/jpeg' });
    expect(mockUpload).toHaveBeenCalledWith('https://upload.example', 'image/jpeg', expect.objectContaining({ uri: 'file:///photo.jpg' }));
    expect(mockRegisterPropertyDocument).toHaveBeenCalledWith('access-token', 'remote-property-1', expect.objectContaining({ object_key: 'assets/photo.jpg', category: 'photo' }));
    expect(mockUpdatePropertyDocument).toHaveBeenCalledWith('access-token', 'remote-document-1', { visibility: 'shared' });
    expect(mockUpdateSync).toHaveBeenLastCalledWith(db, property.id, { remoteId: 'remote-property-1', ownerSub: 'owner-1', status: 'synced', error: null });
  });

  it('retains a local item as an error and reports it for retry after an API failure', async () => {
    const property = { id: 'local-property-2', offlineDraft: null, ownerSub: 'owner-1' } as unknown as LocalProperty;
    mockListPending.mockResolvedValue([property]);

    await expect(syncPendingLocalProperties({} as SQLiteDatabase, 'access-token', 'owner-1')).resolves.toEqual({ synced: 0, errors: [{ id: property.id, message: 'Saved offline property details are unavailable. Open and save this property again.' }] });
    expect(mockUpdateSync).toHaveBeenLastCalledWith(expect.anything(), property.id, expect.objectContaining({ status: 'error' }));
  });
});
