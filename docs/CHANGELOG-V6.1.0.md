# Changelog — v6.1.0

## Added: Hybrid Portable Database (Option A + Option B)
- Added an authorized local-folder persistence module using the browser File System Access API.
- Added optional Native Messaging integration and a companion host source/build/install package for Windows.
- Added portable profile snapshots containing local and remote libraries, settings, category metadata, and collections.
- Added one JSON file per category and subcategory, plus category index, manifest, collections, and legacy-library JSON.
- Added automatic synchronization after the existing save pipeline, including tool add/import/edit/delete and category changes.
- Added daily snapshots, manual backups, portable-folder restore/merge, integrity checks, repair/rebuild, and sync logs.
- Added stale managed category-file cleanup after category rename/deletion.

## Compatibility and safety
- Kept Chrome Storage and IndexedDB as the primary application storage layers.
- Kept the bundled default tools, GitHub remote library, existing settings center, dashboard, search, favorites, collections, analytics, and existing import/export paths.
- Portable sync errors do not block or roll back the existing save pipeline.
- Portable JSON files live in a separately authorized folder; the extension package directory is not modified.
