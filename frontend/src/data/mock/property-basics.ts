import type { PropertyWizardDraft } from './property-wizard';

export const mockPropertyBasics: Pick<PropertyWizardDraft, 'title' | 'description' | 'category' | 'secondaryUses' | 'intent' | 'listingReadiness'> = {
  title: 'Riverside Farm with Coconut Grove',
  description: 'Perennial riverfront agricultural holding featuring 140 productive coconut palms, automated subsurface drip systems, complete solar perimeter fence, and direct paved link-road access. Highly suitable for commercial farming or agro-tourism conversion.',
  category: 'agriculture',
  secondaryUses: ['plots', 'eco_tourism'],
  intent: 'sale',
  listingReadiness: 'draft',
};
