import type { LegalDocumentCategory } from '@/api/legal-document-upload';

export const legalDocumentUploadFixture = {
  validPdf: { filename: 'title-deed.pdf', mimeType: 'application/pdf', sizeBytes: 1024 * 1024 },
  validPng: { filename: 'survey-map.png', mimeType: 'image/png', sizeBytes: 512 * 1024 },
  maximumSizeBytes: 25 * 1024 * 1024,
  categories: ['title_deed', 'survey', 'soil_report', 'other'] as LegalDocumentCategory[],
} as const;
