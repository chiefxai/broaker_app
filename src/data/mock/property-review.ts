import type { ReviewItem, ReviewPhoto, ReviewVoiceMemo } from '@/components/core/wizard/PropertyReviewPublishStep';

// Test-mode visual fixtures only. Live mode always uses uploaded property media.
export const mockReviewPhotos: ReviewPhoto[] = [
  { id: 'mock-review-cover', label: 'Riverside coconut farm overview', isCover: true, uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80' },
  { id: 'mock-review-soil', label: 'Red soil cultivated terrain', uri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80' },
  { id: 'mock-review-water', label: 'Borewell irrigation channel', uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=75&crop=top' },
];

export const mockReviewVoiceMemos: ReviewVoiceMemo[] = [
  { id: 'mock-voice-log-1', state: 'ready', title: 'Canal water timing & yield', durationSeconds: 102 },
];
export const mockPublicShareUrl = 'https://estateflow.test/p/tirunelveli-farm-demo';

export function createPropertyReviewItems(input: {
  title: string; location: string; survey: string; area: string; areaUnit: string; soil: string; water: string[]; price: string; loan: string; legal: string; documentCount: number; authorityCount: number;
}): ReviewItem[] {
  return [
    { id: 'title', label: 'Property Title', value: input.title || 'Add a property title', icon: 'domain', editStep: 1 },
    { id: 'location', label: 'Location & Survey No.', value: input.location || 'Location not added', detail: input.survey ? `Survey Field No. ${input.survey}` : undefined, icon: 'location_on', editStep: 2 },
    { id: 'land', label: 'Land & Natural Features', value: input.area ? `${input.area} ${input.areaUnit}` : 'Land extent not added', tags: [input.soil, ...input.water].filter(Boolean), icon: 'straighten', editStep: 3 },
    { id: 'financials', label: 'Pricing & Financials', value: input.price ? `₹${Number(input.price).toLocaleString('en-IN')}` : 'Price not added', detail: input.loan ? `Outstanding loan: ₹${Number(input.loan).toLocaleString('en-IN')}` : undefined, icon: 'verified', editStep: 4 },
    { id: 'legal', label: 'Legal Documents & Signatories', value: `${input.documentCount} ${input.documentCount === 1 ? 'document' : 'documents'} · ${input.authorityCount} signatories`, detail: input.legal, icon: 'verified_user', editStep: 5 },
  ];
}
