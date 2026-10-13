# Bundled Profile Transfer — v6.1.2

## What this fixes

The dashboard now checks `user-data/profile-data.json` before initializing or saving the Chrome Storage / IndexedDB library. A copied unpacked extension folder can therefore restore the personal profile written there on PC1, instead of immediately saving a default-only library on PC2.

## PC1 setup (required once)

1. Install and register the Native Messaging host using `native-messaging/README.md`.
2. Open Database Manager → Database & Storage.
3. Set the Native Messaging data-folder path to the **absolute path of this extension's `user-data` directory** (the folder containing `profile-data.json`).
4. Enable the Native Messaging helper and click Test / Sync.
5. Verify `user-data/profile-data.json` contains the expected personal tool count before copying the extension. Keep a separate backup too.

## PC2 transfer

1. Copy the entire unpacked extension folder, including `user-data/profile-data.json`.
2. Load that copied folder through `chrome://extensions` → Developer mode → Load unpacked.
3. On first launch, the extension reads the bundled profile and merges it with local Chrome storage before saving. It does not need the PC1 Chrome profile.
4. If you want ongoing writes on PC2, install/register the Native Messaging host there and configure the new PC2 extension's `user-data` absolute path as well.

## Important limits

- Chrome itself does not copy `chrome.storage.local` or IndexedDB when you copy an extension folder.
- The profile file is portable only after it has been written to `user-data/profile-data.json` on PC1. This release cannot recover personal tools that exist only in PC1's Chrome profile and were never exported/synchronized.
- Native Messaging is an optional external helper and must be installed on each PC for automatic file writes. The extension's packaged source files remain read-only to normal extension code.
- Do not point the helper at the whole Downloads directory or drive root. Use only the dedicated `user-data` folder.
