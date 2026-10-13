# Charlie MJ Tool Archive — Settings Center v6.0.2

## Dedicated settings page
The dashboard gear button opens `src/settings.html` in a separate Chrome tab. The settings page has its own stylesheet and controller (`settings.css`, `settings.js`) so the main dashboard remains modular and its existing library UI is not replaced.

## Navigation tabs
1. General — theme, grid density, startup behavior and default view.
2. Database — database manager module, indexing and backup preferences.
3. Categories — category manager and category display safeguards.
4. Subcategories — nested organization preferences.
5. Smart Search — advanced matching, relevance ranking and suggestion limits.
6. Chrome Omnibox — dedicated `cmj` keyword and suggestion preferences.
7. Duplicate Detection — exact URL blocking, domain/path/name signals and similarity warning threshold.
8. Import & Export — JSON/ZIP validation, preview, pre-restore backup and legacy format preferences.
9. Collections — custom and pinned collection preferences.
10. Tool Health — manual/scheduled checks, interval and timeout preferences.
11. Usage Analytics — usage tracking and retention preferences.
12. Keyboard Shortcuts — shortcut reference and Chrome shortcuts page link.
13. Privacy — usage tracking, optional remote sync and diagnostics preferences.
14. Advanced — debug logging, version history, confirmation and migration safeguards.

## UI behavior
- Responsive two-column card grid that collapses to one column on narrow screens.
- Persistent left-side tab navigation on desktop and horizontally scrollable navigation on small screens.
- Independent setting controls, subtle hover/focus feedback and consistent card spacing.
- Save, discard, reset-current-section, and settings JSON import/export actions.
- Settings are stored in `chrome.storage.local` and existing settings are merged rather than replaced.
- Database Manager, archive dashboard and Chrome shortcut management are accessible through quick actions.

## Compatibility and implementation notes
- The settings center is additive; existing dashboard library functions and database modules remain in place.
- Existing v6.0.1 settings (`theme`, `density`, `syncEnabled`, `syncInterval`) are retained.
- Feature switches and preferences are persisted under `settings.moduleFlags` and their respective namespaces. A persisted switch is an available preference; runtime enforcement is only active where the relevant existing module consumes it. Do not infer that every optional subsystem is implemented solely because its setting is visible.
- The legacy Settings modal markup remains as a compatibility fallback, but the dashboard gear opens the dedicated page.
