# Changelog — Charlie MJ Tool Archive

## v6.0.0 — Advanced Edition

### Added
- Central Database Manager page opened in a dedicated Chrome tab.
- Hierarchical category metadata with immutable UUIDs and hierarchy-derived display IDs.
- Nested category creation, rename, deletion, drag-and-drop re-parenting and tool movement.
- Independent category and subcategory collection snapshots in extension storage.
- Category JSON export, multi-JSON import, full database JSON backup, ZIP directory export/import and folder import.
- Smart labels and aliases on tool records.
- Ranked smart search across names, URLs, descriptions, categories, subcategories, tags, aliases and labels.
- Chrome Omnibox search using the `cmj` keyword.
- URL and name similarity percentages in the editor and import preview.
- Command Center using Ctrl+Shift+P.
- Optional metadata fields for category IDs, subcategory IDs, display IDs, labels and aliases.
- Basic bounded tool revision snapshots.
- Smart Collections creation, opening and deletion.

### Improved
- Exact URL identity comparison now preserves meaningful query parameters and path case.
- Different paths on the same domain are no longer treated as exact duplicates solely because the domain matches.
- Existing local and remote library arrays and legacy JSON format remain supported.
- Documentation updated for v6 storage, import/export, URL identity and Omnibox behavior.

### Preserved
- v5 Local Default Library and Remote GitHub Library.
- Unified Library and source badges.
- GitHub synchronization and sync history.
- Existing tool editor, favorites, recently used, category autocomplete, bookmark import, legacy JSON import/export, CSV/HTML export, backups, library comparison, diagnostics and website health checks.

### Not yet included in this release
- Dedicated revision-history browser / one-click restore UI.
- Full collection assignment and collection browsing UI.
- AI categorization or AI-generated descriptions.
- Cross-device cloud sync and local database encryption.
- Per-module settings switches for every optional service.
- Scheduled health monitoring.
