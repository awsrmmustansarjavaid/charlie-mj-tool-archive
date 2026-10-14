# Staging queue and category database (v6.2.0)

## Three layers
1. **Staging** — `chrome.storage.local` key `cmjStagingQueueV1`, mirrored to `user-data/staging/pending-tools.json`.
2. **Primary database** — IndexedDB category collections, written as one JSON file per category.
   - Packaged defaults: `data/database/categories/*.json` (read-only).
   - Personal/portable: `user-data/database/categories/<categoryId>.json`.
3. **Portable profile** — the whole `user-data/` folder (profile, category files, index, manifest, staging mirror, backups).

## Flow
add / import / right-click → staging queue (saved immediately) → validate → normalise → duplicate check → category assigned (created if new) → IndexedDB + category file written → read back & verified → record removed from queue.
If the portable write cannot be verified (folder permission revoked, disk error) the tool is still safe in IndexedDB and stays in the queue as "verifying" until a later retry succeeds. The maintenance interval (default 15 min) is an integrity/reconciliation pass, not the only save.

## Transferring to another PC
1. PC1: Database Manager → Portable Database → **Select Extension Folder for Transfer** (the folder containing `manifest.json`).
2. Click **Run Transfer Readiness Check**. It does a full verified rewrite and must show "Ready to transfer" with your tool/category counts.
3. Copy the whole extension folder to PC2 and load it unpacked. On first open it reads `user-data/`, merges with the packaged defaults by URL (no duplicates) and re-queues anything still pending.

Chrome profile storage (`chrome.storage`, IndexedDB) is never copied with the folder — only what the extension has written into `user-data/` travels.

## Defaults vs personal
Packaged defaults are never modified. The manifest records `defaultToolCount` and `personalToolCount`; the library still shows both together, and GitHub updates only touch the remote library.
