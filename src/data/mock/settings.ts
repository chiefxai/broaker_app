import type { ApiBrokerProfile, ApiBusinessProfile, ApiPropertyCategory, ApiShareDisclosures } from '@/api/backend-api';

export const mockBusinessProfile: ApiBusinessProfile = {
  business_name: 'Vance Real Estate',
  public_phone: '+91 98765 43210',
  public_email: 'marcus.vance@estateflow.io',
  city: 'Chennai',
  district: 'Chennai',
  state: 'Tamil Nadu',
};

export const mockBrokerProfile: ApiBrokerProfile = {
  legal_name: 'Marcus Vance',
  mobile_phone: null,
  operating_language: 'en',
  designation: null,
  license_number: null,
  license_jurisdiction: null,
};

export const mockPropertyCategories: ApiPropertyCategory[] = [
  { code: 'agriculture', label: 'Agriculture Land', sort_order: 0, enabled: true },
  { code: 'plots', label: 'Plots', sort_order: 1, enabled: true },
  { code: 'house_villa', label: 'House / Villa', sort_order: 2, enabled: true },
  { code: 'commercial', label: 'Commercial Building', sort_order: 3, enabled: true },
  { code: 'apartment', label: 'Apartment', sort_order: 4, enabled: true },
];

export const recommendedShareDisclosures: ApiShareDisclosures = {
  show_name: true,
  show_description: true,
  show_location: true,
  show_specifications: true,
  show_price: false,
  show_exact_coordinates: false,
  show_photos: true,
  show_documents: false,
  show_reports: false,
  show_broker_contact: false,
  show_approach_roads: false,
};
