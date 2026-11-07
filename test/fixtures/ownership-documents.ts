import type { OwnershipDocumentsStepProps } from '@/components/core/wizard/OwnershipDocumentsStep';

export const ownershipDocumentsReferenceFixture: OwnershipDocumentsStepProps = {
  authorities: [
    {
      id: 'owner-primary', name: 'K. Muthusamy', phone: '+91 98421 88310', relationship: 'Self / Patta Owner',
      recordLabel: 'Patta Record', recordValue: 'Passbook #892', verificationLabel: 'Aadhaar linked', verificationState: 'verified',
      signatureLabel: 'Ready', signatureState: 'ready',
    },
    {
      id: 'owner-heir', name: 'M. Senthil Kumar', phone: '+91 94432 17290', relationship: 'Son / Legal Heir',
      recordLabel: 'Legal Standing', recordValue: 'NOC & Heir Cert', verificationLabel: 'Documents submitted', verificationState: 'pending',
      signatureLabel: 'Ready', signatureState: 'ready',
    },
  ],
  onAuthoritySave: () => undefined,
  onAuthorityRemove: () => undefined,
  fieldAssociate: { name: 'Arun Broker Associate', phone: '+91 97910 44211', initials: 'AB' },
  onChooseFieldAssociate: () => undefined,
  privateNotes: 'Original 1984 sale deed inspected. Encumbrance Certificate verified clear up to Dec 2024. Expected settlement within 45 days.',
  onPrivateNotesChange: () => undefined,
  lastEditedLabel: 'Last edited today',
  documents: [
    { id: 'mother-deed', name: 'Mother Deed (1984 Registration).pdf', sizeLabel: '4.2 MB', detail: 'SRO Tiruppur Registered', state: 'verified' },
    { id: 'patta-passbook', name: 'Patta Passbook No. 892.pdf', sizeLabel: '1.8 MB', detail: 'Revenue Dept Official', state: 'verified' },
    { id: 'encumbrance', name: 'Encumbrance Certificate (30 Yrs).pdf', sizeLabel: '2.5 MB', detail: 'Nil Encumbrance', state: 'clear' },
  ],
  onChooseDocument: () => undefined,
  onScanDocument: () => undefined,
  onOpenDocument: () => undefined,
  onDocumentActions: () => undefined,
  referenceLinks: [{ id: 'tn-esurvey', title: 'Survey Cadastral Map (TN e-Services)', url: 'https://eservices.tn.gov.in/esurvey/fmb' }],
  onAddReferenceLink: () => undefined,
  onOpenReferenceLink: () => undefined,
};
