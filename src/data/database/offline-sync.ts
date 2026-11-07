import type { SQLiteDatabase } from 'expo-sqlite';
import { File as ExpoFile } from 'expo-file-system';
import {
  createPropertyDraft, createPropertyUploadUrl, patchProperty, registerPropertyDocument,
  publishProperty, savePropertyFeatures, savePropertyFinancials, savePropertyLegal, savePropertyLocation,
  savePropertyPrivateNotes, updatePropertyDocument,
} from '@/api/backend-api';
import type { ApiDocumentCategory, ApiUploadContentType } from '@/api/backend-api';
import { uploadRawFileToPresignedUrl } from '@/api/presigned-upload';
import type { PropertyWizardDraft } from '@/data/mock/property-wizard';
import type { LocalProperty } from '@/data/mock/properties';
import {
  listLocalPropertyAssets, listPendingLocalProperties, updateLocalPropertyAsset,
  updateLocalPropertySync, updateLocalPropertyPublished, type LocalPropertyAsset,
} from './property-repository';

type StoredDraft = { draft: PropertyWizardDraft; loanActive: boolean; irrigationMethod: 'drip' | 'sprinkler' | 'flood' | null; publishWhenSynced?: boolean };
type SyncProgress = (propertyId: string, status: 'syncing' | 'synced' | 'error', message?: string) => void;

function numberOrNull(value: string) {
  const number = Number(value.trim());
  return value.trim() && Number.isFinite(number) && number >= 0 ? number : null;
}
function integerOrNull(value: string) {
  const number = Number(value.trim());
  return value.trim() && Number.isSafeInteger(number) && number >= 0 ? number : null;
}
function coordinateOrNull(value: string, min: number, max: number) {
  const number = Number(value.trim());
  return value.trim() && Number.isFinite(number) && number >= min && number <= max ? number : null;
}

async function syncAsset(db: SQLiteDatabase, accessToken: string, remoteId: string, asset: LocalPropertyAsset) {
  await updateLocalPropertyAsset(db, asset.id, { status: 'uploading', sync_error: null });
  try {
    const file = new ExpoFile(asset.local_uri);
    const presigned = await createPropertyUploadUrl(accessToken, remoteId, { filename: asset.filename, content_type: asset.content_type as ApiUploadContentType });
    await uploadRawFileToPresignedUrl(presigned.upload_url, presigned.content_type, file);
    const document = await registerPropertyDocument(accessToken, remoteId, {
      object_key: presigned.object_key,
      filename: asset.filename,
      content_type: presigned.content_type,
      category: asset.category as ApiDocumentCategory,
      display_name: asset.display_name,
    });
    if (asset.category === 'photo' && asset.visibility !== 'private') {
      await updatePropertyDocument(accessToken, document.id, { visibility: asset.visibility });
    }
    await updateLocalPropertyAsset(db, asset.id, { status: 'uploaded', remote_document_id: document.id, sync_error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed.';
    await updateLocalPropertyAsset(db, asset.id, { status: 'error', sync_error: message });
    throw error;
  }
}

async function syncProperty(db: SQLiteDatabase, accessToken: string, ownerSub: string, property: LocalProperty, onProgress?: SyncProgress) {
  const stored = property.offlineDraft as unknown as StoredDraft | undefined;
  onProgress?.(property.id, 'syncing');
  await updateLocalPropertySync(db, property.id, { status: 'syncing' });
  let remoteId = property.remoteId ?? null;
  try {
    if (!stored?.draft) throw new Error('Saved offline property details are unavailable. Open and save this property again.');
    const { draft, loanActive, irrigationMethod } = stored;
    if (!remoteId) {
      const created = await createPropertyDraft(accessToken, { title: draft.title.trim(), category: draft.category });
      remoteId = created.id;
      await updateLocalPropertySync(db, property.id, { remoteId, ownerSub, status: 'syncing' });
    }
    await patchProperty(accessToken, remoteId, { title: draft.title.trim(), category: draft.category, description: draft.description.trim() || null });
    const step = property.offlineStep ?? 1;
    if (step >= 2) {
      const location = draft.location;
      await savePropertyLocation(accessToken, remoteId, {
        village: location.village || null, address_line: location.village || null, pincode: location.pincode || null,
        taluk: location.taluk || null, district: location.district || null, state: location.state || null,
        latitude: coordinateOrNull(location.latitude, -90, 90), longitude: coordinateOrNull(location.longitude, -180, 180),
        survey_numbers: location.surveyNumbers.split(',').map((item) => item.trim()).filter(Boolean),
        width_ft: numberOrNull(location.widthFt), length_ft: numberOrNull(location.lengthFt), road_width_ft: numberOrNull(location.roadWidthFt),
        frontage_direction: location.frontageDirection || null, road_access_type: location.roadAccessType || null,
        road_subdivision_basis: location.roadSubdivisionBasis || null, highway_distance_km: numberOrNull(location.highwayDistanceKm),
      });
    }
    if (step >= 3) {
      await savePropertyFeatures(accessToken, remoteId, {
        soil_type: draft.soilType, soil_type_other: draft.soilType === 'other' ? draft.soilTypeOther || null : null,
        water_tds_ppm: integerOrNull(draft.waterTdsPpm), agronomist_notes: draft.agronomistNotes || null,
        water_sources: draft.waterSources.map((source) => ({ source_type: source, label: source === 'river' ? 'River / Canal Frontage' : undefined })),
        utilities: [
          ...(['fencing', 'electricity', 'irrigation', 'road_access'] as const).map((utility) => ({ utility_type: utility, available: draft.utilities.includes(utility), ...(utility === 'irrigation' && irrigationMethod ? { details: `Irrigation method: ${irrigationMethod}` } : {}) })),
          ...([['borewell_pump', 'Bore well energized; submersible pump installed'], ['open_well_pump', 'Open well pump house and motor shed'], ['insurance', 'Land or crop insurance coverage']] as const).map(([key, details]) => ({ utility_type: 'other' as const, available: draft.utilities.includes(key), details })),
        ],
      });
    }
    if (step >= 4) {
      await savePropertyFinancials(accessToken, remoteId, {
        currency: 'INR', asking_price_inr: integerOrNull(draft.askingPrice), minimum_price_inr: integerOrNull(draft.minimumPrice),
        area: numberOrNull(draft.area), area_unit: draft.areaUnit, negotiable: draft.negotiable,
        advance_amount_inr: integerOrNull(draft.advanceAmount), outstanding_loan_inr: loanActive ? integerOrNull(draft.outstandingLoan) : null,
        lending_bank: loanActive ? draft.lendingBank || null : null,
      });
    }
    if (step >= 5) {
      await savePropertyLegal(accessToken, remoteId, { title_classification: draft.titleClassification, legal_summary: draft.legalSummary || null });
      await savePropertyPrivateNotes(accessToken, remoteId, draft.privateNotes || null);
    }
    const assets = await listLocalPropertyAssets(db, property.id);
    for (const asset of assets) if (asset.status === 'pending' || asset.status === 'error') await syncAsset(db, accessToken, remoteId, asset);
    if (stored.publishWhenSynced && step >= 4) {
      await publishProperty(accessToken, remoteId);
      await updateLocalPropertyPublished(db, property.id);
    }
    await updateLocalPropertySync(db, property.id, { remoteId, ownerSub, status: 'synced', error: null });
    await updateLocalPropertyPublished(db, property.id, false);
    onProgress?.(property.id, 'synced');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not sync this property.';
    await updateLocalPropertySync(db, property.id, { remoteId: remoteId ?? undefined, ownerSub, status: 'error', error: message });
    onProgress?.(property.id, 'error', message);
    throw error;
  }
}

export async function syncPendingLocalProperties(db: SQLiteDatabase, accessToken: string, ownerSub: string, onProgress?: SyncProgress) {
  const pending = await listPendingLocalProperties(db, ownerSub);
  const errors: { id: string; message: string }[] = [];
  for (const property of pending) {
    try { await syncProperty(db, accessToken, ownerSub, property, onProgress); }
    catch (error) { errors.push({ id: property.id, message: error instanceof Error ? error.message : 'Sync failed.' }); }
  }
  return { synced: pending.length - errors.length, errors };
}
