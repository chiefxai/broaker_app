# Navigation component guide

- `AppHeader`, `AppFooter`, and `OverflowMenu` are shared, data-light UI primitives. Keep route-specific decisions and menu actions caller-owned where possible.
- Use `AppHeader` in screen layouts for consistent brand, workspace badge, theme toggle, and optional back action.
- Mount `AppFooter` once in the app shell so it remains consistent and does not duplicate across screen content. Keep its destinations aligned with registered routes.
- Supply typed `OverflowMenuItem` actions; close the menu before invoking a callback. Keep the menu inside the viewport and accessible by labels and selected/expanded states.
- `OverflowMenu` uses SwiftUI Menu on iOS, Material DropdownMenu on Android, and a web fallback. Add actions through its shared typed interface.
- Use centralized theme tokens and the approved `AppIcon` catalog. Do not add raw platform icon names here.
- Preserve safe-area handling and flexible sizing on small phones, landscape layouts, and larger web windows.
- Use `PlatformBottomSheet` for native bottom-up sheets with caller-owned visibility and dismissal; keep scrollable React Native content inside its host.
- Register public exports in this folder and in the shared component registry; add focused tests for navigation semantics and menu open, select, and dismiss behavior.
