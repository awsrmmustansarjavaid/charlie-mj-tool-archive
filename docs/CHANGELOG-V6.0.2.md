# Changelog — v6.0.2

## Added
- Dedicated Settings Center page, separate from the main dashboard.
- Fourteen settings tabs: General, Database, Categories, Subcategories, Smart Search, Chrome Omnibox, Duplicate Detection, Import & Export, Collections, Tool Health, Usage Analytics, Keyboard Shortcuts, Privacy and Advanced.
- Modern responsive two-column settings card grid, desktop sidebar navigation, compact mobile navigation, hover/focus states and sticky top action bar.
- Independent module preference switches and grouped controls for each system.
- Save, discard, reset-current-section and JSON settings import/export.
- Quick actions to open the Library, Database Manager and Chrome extension shortcuts.
- Documentation for the settings page and settings schema.

## Compatibility
- Existing dashboard and database files are retained.
- Existing `theme`, `density`, `syncEnabled` and `syncInterval` settings are preserved and merged.
- Settings are stored locally in Chrome storage.

## Important
Some advanced options are configuration preferences for their associated modules. Runtime enforcement is limited to controls already consumed by the current module implementations; the UI does not claim a setting alone creates missing subsystem functionality.
