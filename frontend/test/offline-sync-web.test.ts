import type { LocalProperty } from '@/data/mock/properties';
import { getLocalProperty, saveLocalProperty } from '@/data/database/property-repository.web';
import { syncPendingWebProperties } from '@/data/database/offline-sync.web';
import { propertyWizardDraftFixture } from './fixtures/property-wizard';

const mockCreatePropertyDraft = jest.fn();
const mockPatchProperty = jest.fn();
const mockSaveLocation = jest.fn();
const mockSaveFeatures = jest.fn();
const mockSaveFinancials = jest.fn();
const mockSaveLegal = jest.fn();
const mockSaveNotes = jest.fn();
const mockPublishProperty = jest.fn();

jest.mock('@/api/backend-api', () => ({
  createPropertyDraft: (...args: unknown[]) => mockCreatePropertyDraft(...args),
  patchProperty: (...args: unknown[]) => mockPatchProperty(...args),
  savePropertyLocation: (...args: unknown[]) => mockSaveLocation(...args),
  savePropertyFeatures: (...args: unknown[]) => mockSaveFeatures(...args),
  savePropertyFinancials: (...args: unknown[]) => mockSaveFinancials(...args),
  savePropertyLegal: (...args: unknown[]) => mockSaveLegal(...args),
  savePropertyPrivateNotes: (...args: unknown[]) => mockSaveNotes(...args),
  publishProperty: (...args: unknown[]) => mockPublishProperty(...args),
}));
jest.mock('@/api/presigned-upload', () => ({ uploadRawFileToPresignedUrl: jest.fn() }));

describe('web property sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePropertyDraft.mockResolvedValue({ id: 'remote-property-1' });
    mockPatchProperty.mockResolvedValue({});
    mockSaveLocation.mockResolvedValue({});
    mockSaveFeatures.mockResolvedValue({});
    mockSaveFinancials.mockResolvedValue({});
    mockSaveLegal.mockResolvedValue({});
    mockSaveNotes.mockResolvedValue(undefined);
    mockPublishProperty.mockResolvedValue({});
  });

  it('creates the remote draft, saves completed sections, and records its remote ID', async () => {
    const localProperty: LocalProperty = {
      id: 'local-property-1',
      title: propertyWizardDraftFixture.title,
      categoryLabel: 'Agriculture Land',
      status: { label: 'Draft', tone: 'warning' },
      area: null,
      location: null,
      priceInr: null,
      ownerSub: 'owner-1',
      syncStatus: 'pending',
      offlineStep: 4,
      offlineDraft: { draft: propertyWizardDraftFixture, loanActive: false, irrigationMethod: null },
    };
    await saveLocalProperty(localProperty);

    await expect(syncPendingWebProperties('access-token', 'owner-1')).resolves.toEqual({ synced: 1, errors: [] });

    expect(mockCreatePropertyDraft).toHaveBeenCalledWith('access-token', { title: propertyWizardDraftFixture.title, category: 'agriculture' });
    expect(mockPatchProperty).toHaveBeenCalledWith('access-token', 'remote-property-1', expect.objectContaining({ title: propertyWizardDraftFixture.title }));
    expect(mockSaveLocation).toHaveBeenCalledWith('access-token', 'remote-property-1', expect.objectContaining({ district: 'Tirunelveli' }));
    expect(mockSaveFinancials).toHaveBeenCalledWith('access-token', 'remote-property-1', expect.objectContaining({ asking_price_inr: 3600000, area: 150 }));
    await expect(getLocalProperty(localProperty.id)).resolves.toEqual(expect.objectContaining({
      remoteId: 'remote-property-1',
      syncStatus: 'synced',
    }));
  });

  it('publishes a completed property when the final save requests activation', async () => {
    const localProperty: LocalProperty = {
      id: 'local-property-ready',
      title: propertyWizardDraftFixture.title,
      categoryLabel: 'Agriculture Land',
      status: { label: 'Draft', tone: 'warning' },
      area: null,
      location: null,
      priceInr: null,
      ownerSub: 'owner-1',
      syncStatus: 'pending',
      offlineStep: 5,
      offlineDraft: { draft: propertyWizardDraftFixture, loanActive: false, irrigationMethod: null, publishWhenSynced: true },
    };
    await saveLocalProperty(localProperty);

    await expect(syncPendingWebProperties('access-token', 'owner-1')).resolves.toEqual({ synced: 1, errors: [] });

    expect(mockPublishProperty).toHaveBeenCalledWith('access-token', 'remote-property-1');
    await expect(getLocalProperty(localProperty.id)).resolves.toEqual(expect.objectContaining({
      status: { label: 'Available', tone: 'success' },
      syncStatus: 'synced',
    }));
  });
});
