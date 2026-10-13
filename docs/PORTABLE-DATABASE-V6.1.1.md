# Hybrid Portable Database — v6.1.1

## Storage model
- Chrome `storage.local` and the existing IndexedDB database remain the primary live stores.
- The portable folder is an additional, user-authorized persistence and transfer layer.
- Category and subcategory JSON files, `profile-data.json`, indexes, manifests, collections, and dated backups are written outside the extension package. Tool changes, category operations, collection changes, remote-library refreshes, and saved settings trigger portable synchronization when configured.
- The Native Messaging host is an optional second writer/reader. When both Native Messaging and a browser-authorized folder are configured, one sync attempts both destinations.

## Critical restore-before-write behavior
v6.1.1 never immediately writes the current library when a user connects an existing portable folder. It first reads `profile-data.json`, displays its tool/category counts, and asks whether to merge it into the current library. Only after the merge does it synchronize. Declining the merge leaves the existing portable files unchanged. The Native Messaging test workflow follows the same rule and supports chunked profile reads.

## Transfer from PC1 to PC2
1. Keep the old extension installed on PC1 while its personal tools are still visible.
2. Connect an empty portable folder from Database Manager. Wait for successful sync and verify the profile tool count.
3. Copy the entire portable data folder to PC2.
4. On PC2, install/load the extension and connect the copied folder. Accept the merge prompt.
5. Verify the expected local tool count before relying on the second PC.

Do not expect copying only the extension installation folder to transfer Chrome `storage.local` or IndexedDB. Chrome isolates these stores by extension origin/profile. Uninstalling an extension can remove its profile storage; if no backup exists, the extension package cannot recover private records.

## Native Messaging
The companion host now supports `readFile` in bounded chunks as well as writes, inspection, and atomic replacement. Install/register it separately on each PC. If the extension ID changes, update the host's allowed origin by rerunning the installation script.

## Settings hotfix
The Settings renderer flattens nested control definitions before rendering, validates setting paths, and safely resets only valid control entries. A Database & Storage tab links to the Database Manager.
