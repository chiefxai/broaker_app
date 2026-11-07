import { emptyPropertyWizardDraft, type PropertyWizardDraft } from '@/data/mock/property-wizard';

export const propertyWizardDraftFixture: PropertyWizardDraft = {
  ...emptyPropertyWizardDraft,
  title: 'Riverside Farm with Coconut Grove',
  description: 'Agricultural holding with year-round water access.',
  location: { ...emptyPropertyWizardDraft.location, village: 'Ambasamudram', district: 'Tirunelveli', state: 'Tamil Nadu', surveyNumbers: '248/1A', latitude: '8.7139', longitude: '77.7567', widthFt: '320', lengthFt: '450', roadAccessType: 'tar_road', frontageDirection: 'East', roadSubdivisionBasis: 'government_subdivision', highwayDistanceKm: '0' },
  area: '150',
  askingPrice: '3600000',
};
