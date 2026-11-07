# Wizard Component Rules

- Keep wizard steps presentational and controlled: screen state, persistence, and navigation belong to the screen layer.
- Use typed props, shared theme tokens, and the approved `AppIcon` registry. Support small and wide layouts with wrapping and flexible widths.
- Preserve API contract boundaries. If a field is not supported, identify it as draft-only and never imply it was saved remotely.
- Add representative typed mock data and behavior-focused component tests for every new step. Verify accessibility state and interactions.
- Export each step and its public types through this folder's `registry.ts`.
