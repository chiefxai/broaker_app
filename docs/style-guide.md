# EstateFlow UI style guide

This document describes the design system currently implemented in the React Native app. The standalone interactive web guide is available at `/style-guide.html`. It lives under `public/`, outside the app source, and uses the same documented tokens and component patterns.

## Design principles

- **Calm and useful:** portfolio information should be scannable, with clear numbers, short labels, and restrained decoration.
- **One semantic system:** use theme token names rather than copying color values into screens.
- **Native by default:** build shared layouts with React Native primitives and test touch, keyboard, safe-area, and accessibility behavior on iOS, Android, and web.
- **Caller-owned behavior:** reusable components render props and report actions; screens own fetching, routing, and feature decisions.
- **Borderless by default:** use surface contrast and spacing for grouping. Add an outline only when it clarifies an input, focus state, selection, or important boundary.

## Theme and color

The source of truth is `src/theme/tokens.ts`. `AppThemeProvider` in `src/theme/theme-provider.tsx` supports light, dark, and system modes and persists the user's choice. Use `useTheme()` for the active palette and `useAppTheme()` when a component needs the active scheme or theme controls.

| Semantic token | Light | Dark | Use |
| --- | --- | --- | --- |
| `text` | `#0B1C30` | `#F8FAFC` | Main content |
| `textSecondary` | `#45464D` | `#94A3B8` | Supporting content |
| `background` | `#F7FAF7` | `#090E1A` | Screen background |
| `surface` | `#FFFFFF` | `#111827` | Cards and controls |
| `surfaceLow` | `#F0F7F1` | `#131D2E` | Quiet grouped areas |
| `surfaceContainer` | `#E8F5EA` | `#172A20` | Selected and grouped surfaces |
| `surfaceHigh` | `#D8EEDB` | `#20382A` | Raised green-tinted surface |
| `primary` | `#16803C` | `#4ADE80` | Main action and emphasis |
| `primaryPressed` | `#11632E` | `#86EFAC` | Pressed primary treatment |
| `onPrimary` | `#FFFFFF` | `#FFFFFF` | Content on primary |
| `accent` | `#16803C` | `#4ADE80` | Links, focus, active navigation |
| `accentContainer` | `#D8EEDB` | `#183322` | Quiet accent background |
| `success` | `#15803D` | `#4ADE80` | Positive result |
| `warning` | `#B45309` | `#FBBF24` | Caution or pending |
| `danger` | `#BA1A1A` | `#F87171` | Destructive or invalid state |
| `info` | `#15803D` | `#4ADE80` | Informational status |

`getStatusColors(palette, tone)` maps status tones to background, foreground, and icon colors. Do not use the green `info` palette as success meaning: keep the accompanying text explicit. Keep status meaning consistent by using `success`, `warning`, `danger`, `info`, or `neutral`.

### Color rules

- Use `colors.primary` for a primary action and `colors.accent` for active or interactive emphasis.
- Use `colors.text` and `colors.textSecondary` for text. Do not put body text on a saturated accent without a suitable on-color token.
- Use semantic status colors for meaning, not as decoration.
- Avoid hard-coded colors in component styles. Add a semantic token to both palettes when a reusable purpose is missing.
- Check contrast in both palettes. Never communicate state through color alone.

## Typography

Typography tokens are in `src/theme/tokens.ts`. `Fonts` provides platform-aware system font families; web font variables are configured in `src/global.css`.

| Token | Size / line height | Weight | Intended use |
| --- | --- | --- | --- |
| `body` | 14 / 22 | 400 | Default descriptions and input text |
| `bodySmall` | 12 / 18 | 400 | Helper text, metadata, secondary labels |
| `label` | 14 / 20 | 600 | Important field and card labels |
| `labelSmall` | 11 / 14 | 600 | Compact labels, overlines, status metadata |
| `title` | 18 / 24 | 600 | Card and section titles |
| `heading` | 24 / 32 | 600 | Screen heading when the screen needs one |
| `value` | 24 / 32 | 700 | KPI and financial values |

Prefer sentence case for titles and actions. Use uppercase sparingly for small category labels. Keep numbers and currency easy to compare; format INR with the shared formatter in `src/utils/formatters.ts`.

## Spacing, radius, and layout

Use `Spacing` and `Radius` from `@/theme` rather than local one-off values.

| Token | Value |
| --- | ---: |
| `Spacing.half` | 2 px |
| `Spacing.one` | 4 px |
| `Spacing.two` | 8 px |
| `Spacing.three` | 16 px |
| `Spacing.four` | 24 px |
| `Spacing.five` | 32 px |
| `Spacing.six` | 64 px |

| Radius token | Value |
| --- | ---: |
| `small` | 8 px |
| `medium` | 12 px |
| `large` / `card` | 16 px |
| `pill` | 999 px |

- Use a consistent horizontal screen inset, usually `Spacing.three` on phones.
- Center wide content and constrain it with `MaxContentWidth` (800 px) on larger viewports.
- Allow rows and chip groups to wrap or scroll horizontally; never force horizontal page scrolling.
- Respect safe areas and reserve bottom space for the shared tab bar using `BottomTabInset`.
- Prefer flexible `View` layouts and measured min-heights over fixed screen widths.
- Use surface fill and spacing before adding a border. If a border is needed, expose a clear opt-in prop or use a caller-owned `style` prop.

## Components and ownership

Public exports are listed in `src/components/core/registry.ts` and grouped by category in each directory's `registry.ts`.

| Category | Components | Guidance |
| --- | --- | --- |
| Actions | `CoreButton`, `ActionCalloutCard` | Label actions with verbs; pass callbacks from the screen. Support disabled and loading states. |
| Navigation | `AppHeader`, `AppFooter`, `OverflowMenu` | Use shared navigation chrome. Keep screen titles out of content when the footer already names the destination. |
| Property | `PropertyCard`, `PropertyPhotoGallery`, `PropertyFactRow` | Pass typed property display data; handle missing media, prices, and facts safely. |
| Summary | `PortfolioKpiCard`, `SyncStatusCard` | Distinguish ready, loading, and error states; provide retry callbacks when useful. |
| Status | `StatusChip` | Use a semantic `StatusTone` and a readable label. |
| Forms | `CoreTextField`, `SearchField`, `CheckboxField`, `PinCodeInput`, `PasswordStrengthMeter` | Keep values and validation decisions controlled by the caller. Label inputs and expose errors accessibly. |
| Settings/profile | `SettingsRow`, `BusinessProfileCard`, `DeviceSessionCard` | Report actions through props and support missing optional profile details. |
| Media | `DocumentFileRow`, `VoiceMemoCard` | Report playback, retry, and delete actions through callbacks; do not couple to storage services. |
| Icons | `AppIcon` | Use the central icon name union and platform mappings. Do not scatter glyphs or platform-specific names in screens. |
| Theme | `ThemeToggle` | Use the shared provider and preserve system/light/dark selection behavior. |

Import components through `@/components/core` or a documented category entry point. Do not import from a component's implementation file in screens.

## Interaction states

- **Default:** quiet surface, no decorative outline unless needed for clarity.
- **Pressed:** visible but restrained feedback; preserve label contrast.
- **Focused:** use the accent color and a clear focus treatment. On web, suppress browser-default outlines only when an equivalent accessible focus indicator is present.
- **Selected:** use accent or selected surface fill and expose selected state to accessibility APIs.
- **Disabled:** reduce emphasis and set the correct disabled accessibility state; do not rely on opacity alone to explain why.
- **Loading:** expose a progress indicator and accessible busy/loading label; prevent duplicate actions.
- **Error:** use danger color, plain-language message, and retry or correction path when appropriate.
- **Empty:** explain what is missing and the next useful action.

## Forms and validation

- Every input has a visible label or a meaningful `accessibilityLabel`.
- Keep `value`, `onChangeText`, and validation controlled by the parent.
- Make the idle state blend into the surface system; focus and error states must remain distinct.
- Preserve native keyboard types, autocomplete, content types, and submit actions where relevant.
- Keep errors next to the field and announce them as alerts. Do not communicate errors only with a red outline.
- Provide comfortable touch targets and enough room for dynamic text and validation messages.

## Icons and imagery

- Add icons through `src/components/core/icons/AppIcon.tsx` and its registry, with iOS, Android, and web mappings.
- Keep decorative icons hidden from assistive technology. Give standalone meaningful icons an accessible label.
- Use `expo-image` or the established media component for remote imagery, supply an accessibility description, and render a fallback on load failure.
- Keep overlays legible on images with the shared scrim token.

## Accessibility and responsive behavior

- Use React Native accessibility roles, labels, hints, selected/disabled/busy states, and live regions where applicable.
- Support screen readers, dynamic text, keyboard interaction on web, and visible focus.
- Use touch targets around 44 px where practical; avoid placing actions too close together.
- Test narrow phone widths, larger phones, tablet/web widths, and both themes.
- Ensure content scrolls vertically without clipping and that the page has no unintended horizontal overflow.

## Testing and review checklist

- Add behavior-focused tests for component states and interactions; prefer observable text and accessibility queries.
- Use typed fixtures under `test/fixtures/`; mock network calls and avoid live backend dependencies.
- For shared components, cover normal, empty/missing data, loading, error, disabled, and boundary behavior where applicable.
- Run `npm run typecheck`, `npm run lint`, and the relevant Jest tests.
- Check web and native exports for platform-sensitive changes; review light and dark mode on a small and a large viewport.
- Verify that no app-wide color, spacing, typography, or radius values were duplicated locally.

## Source map

- Theme tokens: `src/theme/tokens.ts`
- Theme provider and persistence: `src/theme/theme-provider.tsx`
- Theme registry: `src/theme/registry.ts`
- Core component registry: `src/components/core/registry.ts`
- Icon catalog: `src/components/core/icons/AppIcon.tsx`
- Component authoring rules: `src/components/skills.md`
- Theme authoring rules: `src/theme/skills.md`
