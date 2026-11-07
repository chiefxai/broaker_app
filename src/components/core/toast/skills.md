# Toast Component Rules

- Use `useToast()` for short, cross-screen action feedback: success, failure, warning, or neutral information.
- Keep field validation, persistent loading errors, and messages with retry actions inline beside their controls.
- Toast content and timing are caller-owned; the provider dismisses transient messages and exposes an explicit dismiss action.
- Use theme semantic colors, approved icons, accessible status/alert roles, and platform-neutral React Native primitives.
- Keep this component presentation-only and register it through `registry.ts` and the core component registry.
