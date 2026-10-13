# v6.1.3 — Transfer, Settings & v5 Controls Hotfix

- Reworked browser-folder portable transfer to select the exact unpacked extension root and write the profile into its `user-data` subfolder.
- Added extension-root validation and retained compatibility with older folder handles that selected the data folder directly.
- Treated an empty starter profile as an uninitialized destination so PC1 can populate it from live Chrome Storage + IndexedDB without a zero-tool merge prompt.
- Replaced the empty-profile warning with an informational setup message.
- Kept startup profile restore ahead of database initialization and first save.
- Restored v5.0 library statistics, GitHub connection health, manual/automatic sync controls, local/remote/unified views, comparison, library health, duplicate cleanup, website checks, category manager, full backup, HTML/CSV export, JSON restore, bundled defaults, remote-change review, and GitHub-ready export into dedicated tabs in the existing Settings center.
- Hardened Settings path/control validation and kept the existing dark settings layout.
- Added a safe duplicate cleanup action that merges tags, notes, favorites and usage history before removing duplicate URL records.
- Preserved the existing v6.1.3 version number and existing application modules.

## Validation

Static JavaScript syntax checks, JSON parsing and ZIP integrity checks pass. Live Chrome GUI testing on separate PCs remains necessary; the source PC must authorize the extension folder and verify the personal profile count before copying.
