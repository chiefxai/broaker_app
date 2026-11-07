import type { DocumentFileRowProps } from '@/components/core';

export const verifiedDocument: DocumentFileRowProps = {
  id: 'doc-mother-deed',
  name: 'Mother Deed (1984).pdf',
  detail: 'SRO Tiruppur Registered',
  sizeLabel: '4.2 MB',
  state: 'verified',
};

export const unverifiedDocument: DocumentFileRowProps = {
  id: 'doc-encumbrance',
  name: 'Encumbrance Certificate.pdf',
  detail: '30 year search',
  state: 'error',
};
