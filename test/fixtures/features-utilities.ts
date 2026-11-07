import type { FeaturesUtilitiesStepProps } from '@/components/core/wizard/FeaturesUtilitiesStep';

export const featuresUtilitiesReferenceFixture: Pick<FeaturesUtilitiesStepProps,
  'soilType' | 'soilTypeOther' | 'waterTdsPpm' | 'waterSources' | 'waterSourceDetails' | 'utilities' | 'agronomistNotes' | 'irrigationMethod' | 'soilProfileDetails' | 'irrigationImageCaption'
> = {
  soilType: 'red',
  soilTypeOther: '',
  waterTdsPpm: '100',
  waterSources: ['river', 'borewell', 'open_well'],
  waterSourceDetails: { borewell: '1 Active · 450 ft' },
  utilities: ['fencing', 'electricity', 'borewell_pump', 'open_well_pump', 'road_access'],
  agronomistNotes: '7ft stone pillars with solar energized fence; 120 teak trees along perimeter road',
  irrigationMethod: 'drip',
  soilProfileDetails: {
    topsoilDepthFt: '6.2',
    fertilityIndex: 'Grade A · High Nitrogen',
    organicCarbon: '0.82%',
    organicCarbonStatus: 'Optimal',
    profileCaption: 'Nutrient Rich Profile: Red Ferruginous',
    ph: '6.8',
    labVerified: true,
  },
  irrigationImageCaption: 'Automated Solenoid Valves Connected',
};
