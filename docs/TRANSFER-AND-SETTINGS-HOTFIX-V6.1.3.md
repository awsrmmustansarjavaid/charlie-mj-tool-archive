# Charlie MJ Tool Archive v6.1.3 — Transfer, Settings & v5 Controls Hotfix

## Scope

This is an additive maintenance update on the existing v6.1.3 code line. It preserves the dashboard/library layout, IndexedDB category database, Chrome Storage library model, local and remote libraries, collections, Native Messaging option, and existing tool records. The Settings center keeps its existing dark sidebar/card layout.

## Folder-copy transfer — corrected workflow

Chrome stores `chrome.storage.local` and IndexedDB in the Chrome profile, not in the unpacked extension folder. A folder copy alone cannot include personal records unless the source PC explicitly exports/synchronizes them into the folder first. Chrome also prevents an extension from silently writing into its own installation directory.

1. On PC1, open the extension that currently displays the complete personal library (395 tools in the supplied screenshot).
2. Open **Settings → Database & Storage → Portable Database**.
3. Click **Select Extension Folder for Transfer**.
4. In the folder picker, select the exact unpacked extension root containing `manifest.json`, `src`, and `data`. Do not select Downloads itself or the `user-data` subfolder.
5. Grant read/write permission. The extension creates/uses `<extension-root>/user-data/` and writes `profile-data.json` there from the live local library, remote library, settings, categories and collections.
6. Click **Sync Now**. Verify the profile contains the expected `toolCount` and `categoryCount` (e.g. 395 local tools and 122 categories). Do not copy the folder while the count is zero or incomplete.
7. Copy the complete extension root, including `user-data/profile-data.json`, to PC2.
8. On PC2, load the copied folder with **Load unpacked**. Startup reads the portable profile before initializing/saving defaults, merges records by normalized URL, and restores categories/collections. It must not replace a larger profile with the 330 packaged defaults.

The folder picker is a required one-time authorization on PC1. This is the browser security boundary, not an optional setup preference. The extension cannot bypass it.

## Compatibility

- Existing legacy portable handles that point directly to a data folder remain readable.
- The updated folder picker now selects the extension root and automatically targets its `user-data` subfolder.
- An empty starter `profile-data.json` is not treated as a personal backup. Selecting the extension root on PC1 writes the current profile into it.
- If the profile is still empty, PC2 will only show packaged defaults. The code cannot recreate PC1-only records that were never exported.

## Settings center restored from v5.0

The existing Settings layout now includes dedicated tabs for:

- **GitHub Library Sync:** local/remote/both/local-only/remote-only counts, connection health check, manual sync, auto-sync enable/interval, GitHub library link, and comparison.
- **Library Health & Cleanup:** library diagnostics, duplicate URL cleanup, website health checks, and category manager.
- **Backup & Export:** full profile JSON backup, detailed HTML, CSV, JSON restore, and bundled-default restore.
- **Remote Changes & Safety:** last sync change review, GitHub-ready JSON preparation, local/remote comparison, and local-data protection explanation.
- **Data Model:** portable sync and portable recovery backup controls, plus direct access to Database & Portable Manager.

Existing settings tabs and card styling are retained. The renderer validates setting definitions, accepts only valid string/path-array setting paths, safely flattens nested controls, and reports initialization errors inside the page instead of failing silently.

## Validation and limits

JavaScript syntax, manifest/JSON parsing, ZIP integrity and static feature wiring are checked for this package. A real Chrome GUI/runtime test on PC1 and PC2 is not available in this build environment. After installing, verify the source-PC portable profile count before copying and check `chrome://extensions` for any remaining runtime errors.
