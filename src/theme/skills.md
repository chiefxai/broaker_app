# Theme authoring guide

- Treat `tokens.ts` as the single source of truth for app-wide colors and design values. Add semantic tokens there instead of embedding repeated values in components.
- Add public theme exports to `registry.ts`; keep `index.ts` as the short directory-import entry point.
- Keep light and dark palettes semantically aligned: a token should mean the same thing in both schemes, even when its value differs.
- Use semantic tokens (`surface`, `textSecondary`, `danger`, `successContainer`) instead of palette-specific values in component styles.
- Add shared spacing, typography, radius, and layout values to their matching token groups when they are reused or define a system-wide rule.
- Use `getStatusColors` for status tones so status chips, cards, and messages stay visually consistent.
- Use `AppThemeProvider` at the app root and `useAppTheme`/`useTheme` in themed UI. Do not create a parallel theme context.
- Persist theme preferences through the existing provider and preserve system appearance support. Keep storage failures non-fatal.
- Add or update tests when changing theme selection, persistence, semantic mappings, or shared token behavior; test light/dark states where relevant.
