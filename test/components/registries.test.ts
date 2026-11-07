import { describe, expect, it } from '@jest/globals';

import { Components, Icons, Theme } from '@/registry';
import { CoreButton, PropertyPhotoGallery } from '@/components';
import { AppIcon as CategoryIcon } from '@/components/core/icons';

describe('public registries', () => {
  it('exposes root component, icon, and theme namespaces', () => {
    expect(Components.CoreButton).toBe(CoreButton);
    expect(typeof Components.VoiceMemoCard).toBe('function');
    expect(typeof Icons.AppIcon).toBe('function');
    expect(Theme.Colors.light).toBeDefined();
  });

  it('keeps direct category imports consistent with root exports', () => {
    expect(Components.PropertyPhotoGallery).toBe(PropertyPhotoGallery);
    expect(Icons.AppIcon).toBe(CategoryIcon);
  });
});
