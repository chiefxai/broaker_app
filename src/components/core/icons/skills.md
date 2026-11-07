# Icon catalog guide

- `AppIcon` is the shared icon API. Components should accept or use `AppIconName`, not raw platform symbol strings.
- Keep the public icon exports and icon types together in `registry.ts`; `index.ts` should only forward those exports.
- When adding an icon, extend the `AppIconName` union and provide mappings for iOS, Android, and web in the same change.
- Prefer symbols already supplied by Expo Symbols/platform icon fonts. Confirm the iOS symbol exists and preserve a clear Android/web Material Symbol equivalent.
- Keep names aligned with the reference or semantic action (for example, `location_on`, `verified`, `arrow_forward`). Do not create duplicate aliases for the same meaning without a clear need.
- Keep icon rendering accessible: provide `accessibilityLabel` for meaningful standalone icons; decorative icons should remain hidden from accessibility services.
- Keep the catalog dependency-light and free of feature-specific data. Add a focused test when introducing behavior beyond a new static mapping.
