import type { LocalProperty } from '@/data/mock/properties';
import { mergeLocalAndRemoteProperties } from '@/data/database/use-local-properties.web';

describe('web local and remote property merge', () => {
  it('uses the backend status when a synced remote record exists beside a stale local draft', () => {
    const local: LocalProperty = {
      id: 'local-property-1',
      remoteId: 'remote-property-1',
      ownerSub: 'owner-1',
      syncStatus: 'pending',
      title: 'Farm listing',
      categoryLabel: 'Agriculture Land',
      status: { label: 'Draft', tone: 'warning' },
      area: null,
      location: null,
      priceInr: null,
    };
    const remote: LocalProperty = {
      ...local,
      id: 'remote-property-1',
      remoteId: null,
      syncStatus: undefined,
      status: { label: 'Active', tone: 'success' },
    };

    const [property] = mergeLocalAndRemoteProperties([remote], [local], 'owner-1');

    expect(property).toMatchObject({
      id: 'local-property-1',
      remoteId: 'remote-property-1',
      syncStatus: 'pending',
      status: { label: 'Active', tone: 'success' },
    });
  });
});
