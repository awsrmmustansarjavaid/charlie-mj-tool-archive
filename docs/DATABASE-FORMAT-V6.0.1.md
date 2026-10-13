# Database Format — v6.0.1

## Runtime storage

IndexedDB database: `CharlieMJToolArchiveDB`.

Object stores:
- `categories`: category/subcategory metadata keyed by immutable UUID.
- `categoryCollections`: one record per category/subcategory, keyed by `categoryId`, with `tools` containing only records assigned directly to that collection.
- `collections`: user-defined smart collections referencing tool IDs (records are not duplicated).
- `meta`: schema and initialization metadata.

`chrome.storage.local.localLibrary` remains a compatibility mirror for the v5.0.0 interface and service worker integrations. The new database is read on startup after initialization; changes are written transactionally to IndexedDB and mirrored to the legacy key.

## Portable JSON layout

```text
data/database/
  database-config.json
  categories-index.json
  categories/<category>.json
  subcategories/<parent>/<subcategory>.json
  backup-manifest.json
```

Every collection JSON contains `version`, `app`, `exportType`, `category`, `recordCount`, and `tools`. The ZIP export reproduces this layout and includes `legacy-local-library.json` for compatibility.

## Important Chrome limitation

An installed extension cannot silently write arbitrary JSON files into its own installation directory. Therefore IndexedDB is the writable runtime database; JSON files are generated as user-initiated downloads or included in a ZIP backup. The packaged `data/database/` files are seed/export-format examples generated from the bundled v5 default library.

## Migration

On first v6.0.1 startup, existing v5 `localLibrary` records are preserved and indexed into category collections. Existing record fields and IDs remain intact; optional category IDs, subcategory IDs, and display IDs are added. The legacy key is not removed.
