import type { ApiShareDisclosures } from '@/api/backend-api';

export type SharedLinkStatus = 'active' | 'expired' | 'revoked';

export interface MockSharedLink {
  id: string;
  propertyId?: string;
  resourceType?: 'property' | 'profile';
  includeProfile?: boolean;
  includeProperties?: boolean;
  propertyIds?: string[] | null;
  propertyDisclosures?: Record<string, ApiShareDisclosures>;
  title: string;
  propertyName: string;
  location: string;
  status: SharedLinkStatus;
  access: 'Private' | 'Protected' | 'Unlisted' | 'Public' | 'PIN protected';
  shortUrl: string | null;
  areaLabel: string;
  priceLabel: string;
  mapLabel: string;
  ownerLabel: string;
  documentLabel: string;
  views?: number;
  createdAt?: string;
  createdLabel: string;
  expiryLabel: string;
  imageUri?: string;
  photoRefreshAt?: number;
  expiresAt?: string | null;
  disclosures?: {
    show_name?: boolean;
    show_description?: boolean;
    show_location?: boolean;
    show_price: boolean;
    show_specifications?: boolean;
    show_exact_coordinates: boolean;
    show_photos: boolean;
    show_reports: boolean;
    show_documents?: boolean;
    show_approach_roads: boolean;
  };
}

export const mockSharedLinks: MockSharedLink[] = [
  {
    id: 'link-vip-buyer-deck',
    propertyId: '44d15a4a-1f6b-4823-96ee-b02cf5e2dc33',
    title: 'VIP Buyer Deck · ₹24L / Acre',
    propertyName: 'Green Valley Farm',
    location: 'Tirunelveli',
    status: 'active',
    access: 'Protected',
    shortUrl: 'estateflow.in/s/gv-farm-92ac',
    areaLabel: '92 Ac',
    priceLabel: '₹24L/Acre',
    mapLabel: 'Landmark only',
    ownerLabel: 'Shielded',
    documentLabel: 'Watermarked deck',
    views: 68,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdLabel: 'Created 2d ago',
    expiryLabel: 'Expires in 12d',
    imageUri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=320&q=80',
  },
  {
    id: 'link-highland-brochure',
    title: 'Public Digital Brochure',
    propertyName: 'Highland Agri Orchard',
    location: 'Tenkasi',
    status: 'active',
    access: 'Unlisted',
    shortUrl: 'estateflow.in/s/highland-orchard',
    areaLabel: '150 cents',
    priceLabel: 'Visible',
    mapLabel: 'Exact pin',
    ownerLabel: 'Vault shielded',
    documentLabel: 'Public brochure',
    views: 54,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdLabel: 'Created 5d ago',
    expiryLabel: 'No expiration',
    imageUri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=320&q=80',
  },
  {
    id: 'link-exclusive-offer',
    title: 'Exclusive Investor Offer',
    propertyName: 'Heritage Coconut Grove',
    location: 'Tenkasi',
    status: 'expired',
    access: 'Protected',
    shortUrl: 'estateflow.in/s/heritage-grove',
    areaLabel: '40 acres',
    priceLabel: '₹18L/Acre',
    mapLabel: 'Landmark only',
    ownerLabel: 'Shielded',
    documentLabel: 'Investor deck',
    views: 32,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdLabel: 'Created 30d ago',
    expiryLabel: 'Expired',
  },
];
