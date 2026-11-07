import { describe, expect, it } from '@jest/globals';

import { requiresBrokerAuthentication, shouldShowAppNavigation } from '@/navigation/route-visibility';

describe('app navigation visibility', () => {
  it('shows the footer only on primary tab routes', () => {
    for (const path of ['/', '/explore', '/shared-links', '/settings']) {
      expect(shouldShowAppNavigation(path)).toBe(true);
    }
  });

  it('hides the footer on nested settings and other subpages', () => {
    for (const path of ['/settings/property-setup', '/settings/sharing-defaults', '/settings/security', '/settings/business-profile', '/properties/create', '/properties/123', '/help']) {
      expect(shouldShowAppNavigation(path)).toBe(false);
    }
  });

  it('normalizes trailing slashes on primary routes', () => {
    expect(shouldShowAppNavigation('/settings/')).toBe(true);
  });

  it('allows anonymous access to public share routes', () => {
    for (const path of ['/share/token', '/share/token/', '/p/token', '/broker/token', '/broker/token/']) {
      expect(requiresBrokerAuthentication(path)).toBe(false);
    }
  });

  it('keeps broker workspace routes authenticated', () => {
    for (const path of ['/', '/settings', '/properties/123']) {
      expect(requiresBrokerAuthentication(path)).toBe(true);
    }
  });
});
