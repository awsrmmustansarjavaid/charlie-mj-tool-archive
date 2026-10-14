# v6.2.0 — Staging queue + verified category database

## Added
- **Durable staging queue** (`src/staging-engine.js`). Manual adds, JSON/bookmark imports and right-click saves are written to `chrome.storage.local` (`cmjStagingQueueV1`) and mirrored to `user-data/staging/pending-tools.json` *before* anything else happens. Records are validated, normalised, de-duplicated by exact URL, categorised, written to IndexedDB and the portable category files, read back, and only then removed from the queue. Failed records stay visible and can be retried or discarded.
- **Verified portable writes.** Every file written to `user-data/` is read back (folder handle) or SHA-256 hashed (native helper) and compared. A save is reported as verified only if every file matches; one automatic retry is made for a mismatching file.
- **Category files by stable ID** — `user-data/database/categories/<categoryId>.json` (nested categories in `database/subcategories/`). Renaming a category never breaks its file. New categories receive a file automatically; further tools join the existing file. Unchanged files are not rewritten.
- `database/category-index.json` (id, path, record count, size, SHA-256) and `database/database-manifest.json` (totals, default vs personal split, per-file hash).
- **Recovery loading.** If `profile-data.json` is missing or corrupt, the library is rebuilt from the category files; if those are gone, from `backups/latest-backup.json`. Both sources are merged by URL (newest record wins) and conflicts are counted.
- **Transfer Readiness Check**, **Migration Manager**, **Database Files table** (size, records, status), **Reconcile Databases** (Chrome Storage vs IndexedDB vs portable files, auto-repair) and a maintenance interval (15 min default, 30 min, 1 h, 6 h, daily) in Database Manager.
- Automatic backup before a migration batch (`backups/pre-migration-*.json`), and a safety copy (`backups/pre-overwrite-*.json`) if the first write of a session would shrink an existing portable database. The newest 15 dated backups are kept.
- Native helper 2.0: `hashFiles`, `listFiles`, `removeFile` (limited to `database/`, `backups/`, `staging/`). Older helpers keep working (the extension falls back to reading files back).

## Changed
- The 330 packaged default tools now live only in `data/database/categories/*.json`. `data/default-tools.json` is a small pointer file. `categories-index.json` / `backup-manifest.json` became `category-index.json` / `database-manifest.json`.
- The GitHub remote library loader understands both the old flat `default-tools.json` and the new pointer + category-file format, and rejects an incomplete download instead of partially syncing.
- Right-click "Save to Charlie MJ Tool Archive" now uses the staging queue.

## Unchanged
Dashboard, favourites, notes, categories, collections, Settings Center, omnibox, GitHub sync and the local/remote library separation.

## Settings page
Settings → **Database & Storage** now contains a **Database & Portable Manager** section. It embeds the complete Database Manager page, so every control from "Open Database & Portable Manager" is available there (portable folder + native helper, staging & migration manager, transfer readiness, database files, category tree, collections, backups, restore and recovery). The original "Open Database & Portable Manager" button is kept and still opens the full-page version. Saving the Settings page no longer overwrites values owned by the manager (maintenance interval, native helper path/enable).
