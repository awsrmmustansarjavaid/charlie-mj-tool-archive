# Hybrid Portable Database — v6.1.0

## Purpose

This is an additive persistence and portability layer. It does not replace Chrome Storage, IndexedDB, the bundled default library, GitHub sync, search, collections, favorites, analytics, or existing import/export flows.

## Storage roles

- **Chrome Storage (`localLibrary`, `remoteLibrary`, settings):** existing application state and compatibility layer.
- **IndexedDB (`CharlieMJToolArchiveDB`):** existing live category/subcategory collections and metadata.
- **Portable JSON folder (Option A):** user-authorized folder containing one JSON file per category/subcategory, profile snapshot, category index, collections, manifest, legacy local library, and backups.
- **Native Messaging helper (Option B):** optional companion host that writes the same portable JSON files to a configured normal local folder. It is not allowed to write inside the installed extension directory.

## Portable folder layout

```text
Charlie-MJ-Portable-Data/
├── database/
│   ├── categories/<category>.json
│   ├── subcategories/<parent>/<subcategory>.json
│   ├── category-index.json
│   ├── database-manifest.json
│   ├── collections.json
│   └── legacy-local-library.json
├── profile-data.json
└── backup/
    ├── latest-backup.json
    └── profile-<timestamp>.json
```

## Automatic behaviour

After the existing save pipeline updates Chrome Storage and IndexedDB, it attempts portable synchronization when a destination has been configured. Tool add/import/edit/delete, category/subcategory creation, category moves, and category rename/delete operations use the same save pipeline or are explicitly synchronized. Category JSON files are updated from the authoritative current local library. Category index changes prune files previously managed by the portable database when categories are renamed or deleted. One dated snapshot is created per day, with additional snapshots on manual backup.

If no portable destination is configured, the existing application continues normally. Portable failures are logged and do not roll back or block the primary Chrome Storage / IndexedDB save.

## Option A setup (no companion application)

1. Open Database Manager → Portable Database.
2. Select **Choose Portable Data Folder** and authorize a folder such as `Documents/Charlie-MJ-Portable-Data`.
3. The extension writes the current profile and all category/subcategory JSON files.
4. Future changes are synchronized automatically while the authorized folder remains available.
5. On another PC, copy the portable data folder, open Database Manager, choose **Restore Portable Folder**, and select the copied folder. The restore merges tools and preserves existing records; it does not delete the destination PC's tools.

The browser's folder authorization is local to the browser profile/device and must be granted on each PC.

## Option B setup (Native Messaging)

See `native-messaging/README.md`. Build and install the companion host on each PC, then configure the target folder path and enable Native Messaging in Database Manager. The helper writes files atomically, validates relative paths, rejects traversal, and removes stale managed category JSON files when the category index is updated.

## Safety / compatibility

- No changes are made to the packaged `data/default-tools.json` at runtime.
- The extension cannot silently write into its own installation directory. The portable folder is separate by design.
- Copy both the extension package and the portable data folder to transfer all personal data. Native Messaging must also be installed on each PC if using Option B.
- Existing data remains authoritative if portable sync is unavailable. Sync errors never clear Chrome Storage or IndexedDB.
- Backups and imports are merge-oriented. Review before restoring; keep an independent copy of important data.
