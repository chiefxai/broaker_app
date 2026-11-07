import { describe, expect, it } from '@jest/globals';

import { MAX_LEGAL_DOCUMENT_BYTES, validateLegalDocumentAsset } from '@/api/legal-document-upload';
import { legalDocumentUploadFixture } from '../fixtures/legal-document-upload';

describe('legal document upload validation', () => {
  it('accepts supported legal file types and allows exactly 25 MiB', () => {
    expect(validateLegalDocumentAsset(legalDocumentUploadFixture.validPdf)).toEqual({ contentType: 'application/pdf' });
    expect(validateLegalDocumentAsset({ filename: 'scan.jpeg', mimeType: 'image/jpeg', sizeBytes: 20 })).toEqual({ contentType: 'image/jpeg' });
    expect(validateLegalDocumentAsset({ filename: 'scan.webp', sizeBytes: legalDocumentUploadFixture.maximumSizeBytes })).toEqual({ contentType: 'image/webp' });
    expect(MAX_LEGAL_DOCUMENT_BYTES).toBe(26_214_400);
  });

  it('rejects missing names, empty files, and files above the API size limit', () => {
    expect(() => validateLegalDocumentAsset({ filename: '', sizeBytes: 10 })).toThrow('no filename');
    expect(() => validateLegalDocumentAsset({ filename: 'deed.pdf', sizeBytes: 0 })).toThrow('empty');
    expect(() => validateLegalDocumentAsset({ filename: 'large.pdf', sizeBytes: MAX_LEGAL_DOCUMENT_BYTES + 1 })).toThrow('25 MB');
  });

  it('rejects unsupported and mismatched declared file types', () => {
    expect(() => validateLegalDocumentAsset({ filename: 'deed.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 100 })).toThrow('PDF, JPG, PNG, or WebP');
    expect(() => validateLegalDocumentAsset({ filename: 'deed.pdf', mimeType: 'image/png', sizeBytes: 100 })).toThrow('does not match');
  });
});
