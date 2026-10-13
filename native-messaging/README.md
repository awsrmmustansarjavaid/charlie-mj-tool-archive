# Charlie MJ Native Messaging helper

The helper is optional. It writes portable JSON files to a user-selected folder. For the extension-folder copy workflow, configure its root specifically to the unpacked extension’s `user-data` directory. The helper is an external native program; ordinary extension JavaScript still cannot write packaged files.

## Windows setup
1. Open `chrome://extensions`, enable Developer mode, and copy the extension ID.
2. Install Python 3.10+ on the PC (only needed to build the helper).
3. Open PowerShell in `native-messaging/windows` and run `./build-native-host.ps1`.
4. Run `./install-native-host.ps1` and paste the 32-character extension ID.
5. Restart Chrome. In the extension, open Database Manager → Portable Database, enter the absolute path to the unpacked extension’s `user-data` folder, for example `C:\Users\<you>\Downloads\charlie-mj-tool-archive\user-data`, enable Native Messaging Helper, save, then Test Native Helper / Sync Now.
6. Repeat the helper installation on every PC that should use Native Messaging.

The helper accepts one-file-at-a-time requests, supports bounded/chunked reads of an existing `profile-data.json` before any write, and chunks very large JSON writes to respect Chrome Native Messaging message-size limits. When you test/connect a helper against an existing data folder, v6.1.2 offers to merge the profile before synchronizing so a fresh PC cannot overwrite it with only its bundled defaults. If the extension ID changes (for example, after loading the unpacked extension from a different path), rerun the installer with the new ID. It validates relative paths, rejects traversal, supports integrity inspection, and atomically replaces each JSON file. Keep the portable data folder backed up. The browser folder picker is an alternative that does not require installing the helper.

## Copy-the-extension-folder workflow (the requested workflow)

On PC1, set the Native Messaging data-folder path to the extension project’s `user-data` subfolder (not the extension root). Click Test Native Helper, then Sync Now. Confirm that `user-data/profile-data.json` contains your full personal library before copying the folder. Copy the entire extension folder, including `user-data/profile-data.json`, to PC2. On PC2, Load unpacked. The dashboard reads that JSON profile before it initializes or saves the PC2 Chrome database, and merges the profile with the 330 packaged defaults. To keep saving changes on PC2, install/register the Native Messaging helper on PC2 and point it to PC2’s own copied `user-data` folder.

The profile is not magically extracted from PC1’s Chrome profile: the first PC1 sync is mandatory. If the personal records have not been written to `user-data/profile-data.json`, copying the extension folder cannot transfer them.
