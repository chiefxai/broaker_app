import type { ApiDocumentCategory } from './backend-api';

export type LegalDocumentCategory = Exclude<ApiDocumentCategory, 'photo' | 'voice_memo'>;

export const MAX_LEGAL_DOCUMENT_BYTES = 25 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const ALLOWED_MIME_TYPES = new Set(Object.values(MIME_BY_EXTENSION));

export function validateLegalDocumentAsset(input: {
  filename: string;
  mimeType?: string | null;
  sizeBytes: number;
}): { contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' } {
  const filename = input.filename.trim();
  if (!filename) throw new Error('The selected document has no filename. Choose it again.');
  if (filename.length > 255) throw new Error('The filename must be 255 characters or fewer.');
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) throw new Error('The selected document is empty or its size could not be read.');
  if (input.sizeBytes > MAX_LEGAL_DOCUMENT_BYTES) throw new Error('Choose a document no larger than 25 MB.');

  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  const extensionMime = MIME_BY_EXTENSION[extension];
  const declaredMime = input.mimeType?.toLowerCase().trim();
  const mimeType = declaredMime && ALLOWED_MIME_TYPES.has(declaredMime) ? declaredMime : extensionMime;
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error('Choose a PDF, JPG, PNG, or WebP document.');
  }
  if (declaredMime && ALLOWED_MIME_TYPES.has(declaredMime) && extensionMime && declaredMime !== extensionMime) {
    throw new Error('The document type does not match its filename. Choose the original file.');
  }

  return { contentType: mimeType as 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' };
}
