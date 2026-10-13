# v6.1.1 — Portable Restore & Settings Hotfix

## Fixed
- Fixed Settings crash caused by passing a whole nested control array to `controlHTML`; card controls are now flattened before rendering.
- Added defensive validation for settings paths and malformed control definitions.
- Fixed Settings section reset to operate on individual controls.
- Added the Database & Storage Settings tab.
- Fixed a destructive portable-folder connection sequence: an existing `profile-data.json` is read and offered for merge before the extension writes anything.
- Added chunked `readFile` support to the Native Messaging host so existing portable profiles can be restored before synchronization.

## Preserved
- Existing Chrome Storage and IndexedDB remain the primary application stores.
- Existing packaged default tools, local/remote libraries, categories, collections, favorites, search, analytics, and other modules are retained.
- Portable synchronization remains an additional layer.

## Transfer reminder
On the original PC, first create/synchronize a portable data folder while the personal tools are still present. Copy that separate folder to the second PC. On the second PC, connect the copied folder and accept the merge prompt. Copying only the extension package cannot transfer Chrome-profile storage.
