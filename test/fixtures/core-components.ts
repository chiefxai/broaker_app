import type { PropertyCardItem } from '@/components/core';

export const portfolioKpiFixture = {
  label: 'All properties',
  value: 2,
  description: 'Across your workspace',
  icon: 'real_estate_agent',
  tone: 'neutral',
  badge: { label: 'Total', tone: 'neutral' },
} as const;

export const propertyCardFixtures: PropertyCardItem[] = [
  {
    id: '4a83e9c8-7643-4cbe-9e32-a7fa042aa5c0',
    title: 'Riverside Farm with Coconut Grove',
    categoryLabel: 'Agriculture Land',
    status: { label: 'Available', tone: 'success' },
    area: { value: 150, unit: 'cent' },
    location: 'Sample Village, Tirunelveli',
    priceInr: 2_400_000,
    image: {
      uri: 'https://images.example.test/riverside-farm.jpg',
      accessibilityLabel: 'Riverside agricultural land with a coconut grove',
    },
    footerLabel: 'Workspace only',
    footerIcon: 'visibility',
  },
  {
    id: '44d15a4a-1f6b-4823-96ee-b02cf5e2dc33',
    title: 'Agriculture Land',
    categoryLabel: 'Agriculture Land',
    status: { label: 'Hold', tone: 'warning' },
    area: { value: 1, unit: 'acre' },
    location: null,
    priceInr: 1_000_000,
    image: null,
  },
];

export const propertyCardErrorFixture = {
  errorMessage: 'Could not load this property.',
} as const;
