import type { PropertyPhoto, PropertyFactRowProps, PropertyCardItem } from '@/components/core';
import type { ListingReadiness, PropertyIntent, SecondaryUse } from '@/components/core/wizard/PropertyBasicsStep';

export interface LocalProperty extends PropertyCardItem {
  remoteId?: string | null;
  ownerSub?: string | null;
  syncStatus?: 'synced' | 'pending' | 'syncing' | 'error';
  offlineDraft?: Record<string, unknown>;
  offlineStep?: number;
  syncError?: string;
  photoRefreshAt?: number;
  description?: string;
  photos?: PropertyPhoto[];
  documents?: LocalPropertyDocument[];
  negotiable?: boolean | null;
  minimumPriceInr?: number | null;
  advanceAmountInr?: number | null;
  outstandingLoanInr?: number | null;
  legalTitle?: string | null;
  privateNotes?: string;
  secondaryUses?: SecondaryUse[];
  transactionIntent?: PropertyIntent;
  listingReadiness?: ListingReadiness;
  facts?: Pick<PropertyFactRowProps, 'icon' | 'label' | 'value' | 'detail'>[];
}

export interface LocalPropertyDocument {
  id: string;
  title: string;
  categoryLabel: string;
  detailLabel: string;
  sizeLabel: string;
  statusLabel?: string;
}

export const mockProperties: LocalProperty[] = [
  {
    id: '4a83e9c8-7643-4cbe-9e32-a7fa042aa5c0',
    title: 'Sample · Riverside Farm',
    categoryLabel: 'Agriculture Land',
    status: { label: 'Available', tone: 'success' },
    area: { value: 150, unit: 'cent' },
    location: 'Sample Village, Tirunelveli',
    priceInr: 2_400_000,
    negotiable: true,
    legalTitle: 'Clear title',
    referenceCode: 'PRO-2026-F92AC30C',
    photoCount: 6,
    image: { uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80', accessibilityLabel: 'Riverside agricultural land with a coconut grove' },
    footerLabel: 'Workspace only',
    footerIcon: 'visibility',
    description: 'A riverfront agricultural holding with productive coconut trees, an active borewell, year-round water access, and a wide approach road.',
    photos: [
      { uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80', accessibilityLabel: 'Riverside farm from the entrance' },
      { uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80&sat=-30', accessibilityLabel: 'Agricultural field and coconut grove' },
      { uri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80', accessibilityLabel: 'Water access along the property' },
      { uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=75&crop=top', accessibilityLabel: 'Open field and farm boundary' },
      { uri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=75&sat=-20', accessibilityLabel: 'Farm landscape from the eastern side' },
      { uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=70&sat=-15', accessibilityLabel: 'Riverside crop field detail' },
    ],
    facts: [
      { icon: 'eco', label: 'Land & soil profile', value: 'Red loamy soil', detail: 'Fertile multi-crop yield' },
      { icon: 'water_drop', label: 'Water sources & utilities', value: 'Borewell · Farm power', detail: 'Active stream' },
      { icon: 'fence', label: 'Perimeter & survey', value: 'Fully fenced', detail: 'Survey stones placed' },
      { icon: 'location_on', label: 'Location', value: 'Tirunelveli District', detail: 'Tamil Nadu' },
      { icon: 'schedule', label: 'Frontage', value: '180 Feet', detail: 'North-facing' },
      { icon: 'verified', label: 'Road access', value: '30 ft Tar', detail: 'Heavy vehicle access' },
    ],
    documents: [
      { id: 'mock-ledger', title: 'Pattadhar Passbook Copy', categoryLabel: 'Land ledger', detailLabel: 'Revenue portal · Redacted', sizeLabel: '1.8 MB', statusLabel: 'Redacted' },
      { id: 'mock-boundary', title: 'FMB Sketch & Boundary Map', categoryLabel: 'Cadastral map', detailLabel: 'High resolution', sizeLabel: '2.4 MB', statusLabel: 'Certified extract' },
    ],
  },
  {
    id: '44d15a4a-1f6b-4823-96ee-b02cf5e2dc33',
    title: 'Green Valley Groves · Plot 4',
    categoryLabel: 'Agriculture Land',
    status: { label: 'Hold', tone: 'warning' },
    area: { value: 1, unit: 'acre' },
    location: 'Near Tenkasi Road, Tirunelveli',
    priceInr: 1_000_000,
    negotiable: false,
    referenceCode: 'PRO-2026-19029B3F',
    photoCount: 4,
    image: { uri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80', accessibilityLabel: 'Green Valley agricultural plot' },
    description: 'A compact agricultural parcel near Tenkasi Road.',
    photos: [
      { uri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80', accessibilityLabel: 'Green Valley parcel' },
      { uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80', accessibilityLabel: 'Green Valley farm field' },
      { uri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=75&sat=-25', accessibilityLabel: 'Agricultural land boundary' },
      { uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=70&crop=bottom', accessibilityLabel: 'Open field near the road' },
    ],
    facts: [
      { icon: 'domain', label: 'Property type', value: 'Agriculture land' },
      { icon: 'location_on', label: 'Location', value: 'Tirunelveli District', detail: 'Tamil Nadu' },
      { icon: 'verified', label: 'Road access', value: 'Tenkasi Road', detail: 'Approach road' },
    ],
  },
];
