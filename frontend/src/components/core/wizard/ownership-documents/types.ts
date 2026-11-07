import type { LegalDocumentCategory } from '@/api/legal-document-upload';

export interface SigningAuthority {
  id: string;
  name: string;
  phone?: string;
  relationship: string;
  recordLabel: string;
  recordValue: string;
  verificationLabel: string;
  verificationState: 'verified' | 'pending';
  signatureLabel: string;
  signatureState: 'ready' | 'pending';
  portraitUri?: string | null;
}

export type SigningAuthorityDetails = Omit<SigningAuthority, 'id'>;

export interface LegalDocument {
  id: string;
  name: string;
  sizeLabel: string;
  detail: string;
  state: 'verified' | 'pending' | 'verifying' | 'error' | 'clear';
}

export interface PropertyReferenceLink {
  id: string;
  title: string;
  url: string;
}

export interface AssignedFieldAssociate {
  name: string;
  phone?: string;
  initials?: string;
}

export interface OwnershipDocumentsStepProps {
  authorities: SigningAuthority[];
  onAuthoritySave: (authority: SigningAuthorityDetails, id?: string) => void | Promise<void>;
  onAuthorityRemove: (id: string) => void | Promise<void>;
  fieldAssociate?: AssignedFieldAssociate | null;
  onChooseFieldAssociate?: () => void;
  privateNotes: string;
  onPrivateNotesChange: (value: string) => void;
  lastEditedLabel?: string;
  documents: LegalDocument[];
  onChooseDocument: (category: LegalDocumentCategory) => void;
  selectedDocumentCategory?: LegalDocumentCategory;
  onDocumentCategoryChange?: (category: LegalDocumentCategory) => void;
  isUploadingDocument?: boolean;
  onScanDocument: () => void;
  onOpenDocument?: (document: LegalDocument) => void;
  onDocumentActions?: (document: LegalDocument) => void;
  referenceLinks: PropertyReferenceLink[];
  onAddReferenceLink: () => void;
  onOpenReferenceLink: (link: PropertyReferenceLink) => void;
  authorityManagementAvailable?: boolean;
  isLoadingAuthorities?: boolean;
  authoritiesError?: string;
  onRetryAuthorities?: () => void;
  referenceLinksAvailable?: boolean;
  isLoadingDocuments?: boolean;
  documentsError?: string;
  onRetryDocuments?: () => void;
}

