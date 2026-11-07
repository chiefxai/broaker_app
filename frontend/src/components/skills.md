# Component authoring guide

- Keep components reusable and presentation-focused. Pass display data and callbacks through typed props; leave fetching, caching, routing, and feature decisions to the owning screen or feature layer.
- Prefer native React Native primitives and accessible controls so one implementation adapts to iOS, Android, and web. Use platform-specific files only to handle a real platform difference.
- Read visual values from `@/theme`; avoid local app-wide colors, spacing, typography, and corner radii.
- Use `@/components/core/icons` for all symbols. Do not add emoji, raw glyphs, or one-off icon dependencies.
- Model asynchronous UI with explicit states where useful. Preserve sensible labels, disabled/loading behavior, empty values, and retry callbacks.
- Keep components small and give props defaults only when those defaults are safe and predictable.
- Add typed mock data in `test/fixtures/` and behavior-focused tests in `test/components/`. Assert accessibility and observable outcomes, including relevant state and boundary cases.
- Register public components and prop types in the nearest `registry.ts`. Keep `index.ts` as a thin re-export so directory imports remain stable.
- Add each component category to `core/registry.ts`, then expose the shared component API from `components/registry.ts`. Keep the app-wide namespace registry in `src/registry.ts` free of component implementation details.
- Keep cross-feature controls in `core/`, with focused subfolders for form inputs, property detail, profile, settings, media, and wizard primitives when appropriate.
- For inputs, keep field values and validation decisions caller-controlled. A component may handle predictable display behavior (password visibility, digit-only PIN display, strength feedback), but it must report changes through props.
- Make media fallbacks, missing profile data, disabled controls, and security-sensitive input states accessible and deterministic.
- Media components should report playback, retry, and deletion through callbacks; they must not assume a particular recorder, upload service, or storage provider.
