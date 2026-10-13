# Charlie MJ Tool Archive v6.1.3 — Transfer and Settings Hotfix

## What this update changes

- Makes Settings control traversal defensive. Settings paths accept only a dotted string or an explicit path array; nested control groups are recursively flattened before rendering. Invalid definitions no longer crash the entire page.
- Adds a visible **Download Transfer Profile** action in Database Manager.
- Clarifies the supported copy-folder workflow: on the source PC, authorize the unpacked extension's `user-data` folder and sync the complete profile there before copying the extension folder.
- Keeps the startup restore check ahead of `ensureInitialized()` and `saveLocal()`.
- Restores category metadata and collections from a bundled profile independently of whether the tool count increased.
- Keeps existing Chrome Storage, IndexedDB, packaged defaults, local/remote libraries, and other modules in place.

## Required one-time source-PC setup

Chrome extensions cannot silently write to their own installation directory. To put personal records inside the unpacked extension folder:

1. On PC1, open Charlie MJ Tool Archive and confirm the personal library shows the expected total.
2. Open **Database Manager → Portable Database**.
3. Click **Choose Portable Folder / Extension user-data**.
4. Select the `user-data` directory inside the exact unpacked extension folder that Chrome is loading. Do not select the extension root, Downloads root, or drive root.
5. Grant read/write permission.
6. Click **Sync Now**. Wait for completion.
7. Verify that `user-data/profile-data.json` exists and its `localLibrary` contains the expected number of personal/local records. Also verify `toolCount` and category count.
8. Only then copy the entire unpacked extension folder to PC2.

On PC2, load the copied folder using **Load unpacked**. Startup reads `user-data/profile-data.json` before saving the local profile, merges it with packaged defaults, and then persists the result into PC2's Chrome Storage and IndexedDB.

## Manual fallback

Use **Download Transfer Profile** on PC1. Place the downloaded `profile-data.json` into the copied extension's `user-data` directory before loading it on PC2.

## Important limitation

The repository ZIP cannot contain the user's private 65 records unless those records are first exported from PC1. The committed `user-data/profile-data.json` is an empty starter profile and is not a backup of a user's Chrome profile. No code update can reconstruct private records that were never exported or synchronized.

## Settings troubleshooting

The Settings renderer now normalizes path inputs and recursively flattens nested control definitions. If an older unpacked copy is still loaded, remove that old unpacked entry from `chrome://extensions`, extract this release to a new folder, then use **Load unpacked** on the new folder. Do not mix files from different releases.
