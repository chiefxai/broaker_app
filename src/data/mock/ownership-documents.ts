import type { AssignedFieldAssociate, LegalDocument, PropertyReferenceLink, SigningAuthority } from '@/components/core/wizard/OwnershipDocumentsStep';

// Demo-only content based on the ownership step reference. Live mode always loads records from the API.
export const mockSigningAuthorities: SigningAuthority[] = [
  { id: 'mock-owner-primary', name: 'K. Muthusamy', phone: '+91 98421 88310', relationship: 'Self / Patta Owner', recordLabel: 'Patta Record', recordValue: 'Passbook #892', verificationLabel: 'Aadhaar Linked', verificationState: 'verified', signatureLabel: 'Ready', signatureState: 'ready' },
  { id: 'mock-owner-cosigner', name: 'M. Senthil Kumar', phone: '+91 94432 17290', relationship: 'Son / Legal Heir', recordLabel: 'Legal Standing', recordValue: 'NOC & Heir Cert', verificationLabel: 'Not verified', verificationState: 'pending', signatureLabel: 'Ready', signatureState: 'ready' },
];

export const mockOwnershipDocuments: LegalDocument[] = [
  { id: 'mock-document-mother-deed', name: 'Mother Deed (1984 Registration).pdf', sizeLabel: '4.2 MB', detail: 'SRO Tiruppur Registered', state: 'verified' },
  { id: 'mock-document-patta', name: 'Patta Passbook No. 892.pdf', sizeLabel: '1.8 MB', detail: 'Revenue Dept Official', state: 'verified' },
  { id: 'mock-document-encumbrance', name: 'Encumbrance Certificate (30 Yrs).pdf', sizeLabel: '2.5 MB', detail: 'Nil Encumbrance', state: 'clear' },
];

export const mockFieldAssociate: AssignedFieldAssociate = { name: 'Arun Broker Associate', phone: '+91 97910 44211', initials: 'AB' };

export const mockPropertyReferenceLinks: PropertyReferenceLink[] = [
  { id: 'mock-reference-survey', title: 'Survey Cadastral Map (TN e-Services)', url: 'https://eservices.tn.gov.in/esurvey/fmb' },
];

export const mockPrivateBrokerNotes = 'Original 1984 sale deed inspected. Encumbrance Certificate verified clear up to Dec 2024. Expected settlement within 45 days.';
