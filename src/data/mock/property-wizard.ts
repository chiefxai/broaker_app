import type { ApiPropertyCreate, PropertyCategory } from '@/api/backend-api';
import type { ListingReadiness, PropertyIntent, SecondaryUse } from '@/components/core/wizard/PropertyBasicsStep';

export interface PropertyWizardDraft {
  title: string;
  description: string;
  category: PropertyCategory;
  secondaryUses: SecondaryUse[];
  intent: PropertyIntent;
  listingReadiness: ListingReadiness;
  location: { village: string; pincode: string; taluk: string; district: string; state: string; surveyNumbers: string; widthFt: string; lengthFt: string; roadWidthFt: string; frontageDirection: string; roadAccessType: string; latitude: string; longitude: string; roadSubdivisionBasis: string; highwayDistanceKm: string; assignmentLand: boolean };
  soilType: 'red' | 'black' | 'alluvial' | 'sandy_loam' | 'other';
  soilTypeOther: string;
  waterTdsPpm: string;
  waterSources: ('river' | 'canal' | 'borewell' | 'open_well' | 'government_supply')[];
  utilities: ('fencing' | 'electricity' | 'irrigation' | 'road_access' | 'borewell_pump' | 'open_well_pump' | 'insurance')[];
  agronomistNotes: string;
  askingPrice: string;
  minimumPrice: string;
  area: string;
  areaUnit: string;
  negotiable: boolean;
  advanceAmount: string;
  outstandingLoan: string;
  lendingBank: string;
  titleClassification: 'ryotwari_patta' | 'natham' | 'gramathu_natham' | 'other';
  legalSummary: string;
  privateNotes: string;
}

export const emptyPropertyWizardDraft: PropertyWizardDraft = {
  title: '', description: '', category: 'agriculture', secondaryUses: [], intent: 'sale', listingReadiness: 'draft',
  location: { village: '', pincode: '', taluk: '', district: '', state: '', surveyNumbers: '', widthFt: '', lengthFt: '', roadWidthFt: '', frontageDirection: '', roadAccessType: '', latitude: '', longitude: '', roadSubdivisionBasis: '', highwayDistanceKm: '', assignmentLand: false },
  soilType: 'red', soilTypeOther: '', waterTdsPpm: '', waterSources: [], utilities: [], agronomistNotes: '',
  askingPrice: '', minimumPrice: '', area: '', areaUnit: 'cent', negotiable: true, advanceAmount: '', outstandingLoan: '', lendingBank: '',
  titleClassification: 'ryotwari_patta', legalSummary: '', privateNotes: '',
};

export const propertyCategoryOptions: { value: PropertyCategory; label: string; description: string }[] = [
  { value: 'agriculture', label: 'Agriculture Land', description: 'Farmland, plantations, groves' },
  { value: 'plots', label: 'Plots & Parcels', description: 'Layouts and land parcels' },
  { value: 'house_villa', label: 'House / Villa', description: 'Homes, villas and cottages' },
  { value: 'commercial', label: 'Commercial', description: 'Retail and commercial property' },
  { value: 'apartment', label: 'Apartment', description: 'Apartments and complexes' },
];

export function toCreatePropertyInput(draft: PropertyWizardDraft): ApiPropertyCreate {
  return { title: draft.title.trim(), category: draft.category };
}
