# ✨ Charlie MJ Tool Archive v6.2.0 — Advanced Edition

A modern **Manifest V3 Chrome extension** for organizing a large personal collection of websites, online tools, learning resources, AI services, developer utilities, social-media tools, productivity resources, and other bookmarks.

**Charlie MJ Tool Archive v6.1.2** preserves the v5.0.0 Dual Library Architecture and adds a modular advanced resource-management layer with:

* 🏠 **Local Default Library**
* ☁️ **Remote GitHub Library**
* 🔗 **Unified Library**
* 🏷️ **Source-aware badges**
* 🔄 **GitHub synchronization**
* ⇄ **Local vs Remote comparison**
* 🧠 **Smart Library management**
* 🧹 **Duplicate protection and cleanup**
* 💾 **Backup and export**
* 🔐 **Local-first personal data**

The extension is designed to remain useful both **offline** and when connected to the GitHub remote library.

<p align="center">
  <img src="./assets/85d6b421-b702-43ab-aebc-1713e4747ca7.png" alt="Charlie MJ Tool Archive" width="600">
</p>

## Download

<p align="center">
  <a href="/downloads/charlie-mj-tool-archive-v6_2_0-settings-manager.zip">
    <img src="https://img.shields.io/badge/⬇%20Download%20Chrome%20Extension-2ea44f?style=for-the-badge" alt="Download Chrome Extension">
  </a>
</p>


---

# 🚀 v6.0.1 Advanced Edition Highlights

Version 6.0.1 is a corrective additive database upgrade. The existing Local Default Library, Remote GitHub Library, Unified Library, tool editor, favorites, source badges, synchronization, legacy JSON import/export, CSV/HTML exports, bookmark import, diagnostics and existing settings remain in place.

* 🗄️ **Central Database Manager** with independent category collections
* 🌳 **Hierarchical categories** with nested subcategories and stable IDs
* 🔎 **Smart search** across tool names, URLs, descriptions, categories, tags, aliases and generated labels
* 🌐 **Chrome Omnibox search** using the `cmj` keyword (type `cmj`, then a space, then your query)
* 📊 **URL similarity analysis** that distinguishes exact duplicates from similar-but-distinct paths
* 📦 **Category JSON export/import** and complete database JSON backups
* 🗜️ **ZIP directory backup and restore** for category JSON collections
* 📚 **Smart Collections** with create, open and delete actions
* ⌘ **Command Center** (Ctrl+Shift+P)
* 🧾 **Tool metadata**: category IDs, subcategory IDs, display IDs, aliases and smart labels
* 🕘 **Basic tool revision snapshots** retained in local storage (a dedicated revision-browser UI is a future enhancement)
* 🧩 **Additive modular services** in `src/advanced.js` and `src/zip-manager.js`

### v6.1.2 portable profile transfer

This release checks `user-data/profile-data.json` before initializing/saving the local library. To use the requested copy-the-extension-folder workflow, first install the Native Messaging host on PC1 and set its data-folder path to the unpacked extension’s `user-data` directory. Run Test Native Helper / Sync Now and verify the profile contains all personal tools. Copy the complete extension folder (including `user-data/profile-data.json`) to PC2 and Load unpacked. The dashboard merges that profile before its first save. For ongoing writes on PC2, install the helper there and configure its path to the PC2 `user-data` directory. The helper is optional for normal extension use but required for automatic file writes. See `docs/BUNDLED-PROFILE-TRANSFER-V6.1.2.md`.

### Install / upgrade

1. Extract the ZIP to a new folder; do not overwrite your existing project folder.
2. Open `chrome://extensions` and enable Developer mode.
3. If upgrading an installed copy, export a v5 backup first.
4. Select **Load unpacked** and choose the extracted `charlie-mj-tool-archive` folder (or use **Reload** if replacing the unpacked folder).
5. Open the extension dashboard and allow the one-time v6 metadata initialization to finish.
6. Test the local library, remote sync, import/export and Omnibox (`cmj` + Space).

Chrome Omnibox integration is opt-in by its keyword activation: Chrome does not let extensions intercept every ordinary address-bar keystroke. The extension uses the supported `cmj` keyword provider.

### Data and compatibility notes

* `localLibrary` and `remoteLibrary` remain in `chrome.storage.local` for v5 compatibility and service-worker integrations. IndexedDB is the v6 local category database.
* v6.0.1 stores category collections in IndexedDB and maintains the legacy localLibrary key as a compatibility mirror.
* Category JSON files are portable import/export artifacts. Normal extension JavaScript cannot write into its installation directory; the optional Native Messaging helper can write to the user-authorized `user-data` directory.
* ZIP backups contain one JSON collection per category plus index/config/manifest files.
* URL comparison preserves meaningful path case and query parameters; it ignores fragments, leading `www.`, default ports and trailing slash differences.
* Similarity percentages are advisory. Only exact canonical URL matches are blocked by the standard save/import flow; similar URLs remain reviewable and importable.

### v6.0.1 documentation

* `docs/V6.0.0-ADVANCED-FEATURES.md` (updated for v6.0.1)
* `docs/DATABASE-FORMAT-V6.0.1.md`
* `docs/CHANGELOG-V6.0.1.md`
* `docs/CHARLIE-MJ-TOOL-ARCHIVE.md`
* `docs/DATA-FORMAT.md`
* `docs/V5.0.0-DUAL-LIBRARY.md` (historical v5 behavior plus v6 compatibility notes)

---

# 🚀 v5.0.0 Highlights

* 🏠 **Local Default Library** from `data/default-tools.json`
* ☁️ **Remote GitHub Library** from the project's GitHub `data/default-tools.json`
* 🔗 **Unified Library** that combines both sources
* 🏷️ **Source badges**

  * `🏠 LOCAL`
  * `☁️ REMOTE`
  * `🏠 LOCAL + ☁️ REMOTE`
* 🔎 Source filtering

  * All
  * Local
  * Remote
  * Local + Remote
* ⇄ **Library Comparison**
* 🔄 **Sync History**
* 🛡️ **Remote deletion protection**
* ＋ **Create Local Copy** for remote-only tools
* ⚙️ Configurable automatic GitHub synchronization
* 🧹 URL normalization and duplicate protection
* 🧠 Smart category autocomplete
* 🗂️ Category Manager
* 🏷️ Smart tag suggestions
* 🔎 Similar-tool detection
* 📥 Import Preview
* ☑️ Bulk selection and actions
* 🩺 Library Health diagnostics
* 🌐 Manual Website Health Checker
* 💾 JSON backup and restore
* 📊 CSV export
* 🌐 Detailed offline HTML export
* 🐙 GitHub-ready `default-tools.json` export
* ⭐ Favorites
* 🕘 Recently Used
* 📊 Usage statistics
* 🌙 System / Light / Dark themes
* 📐 Comfortable / Compact grid
* 🖱️ Chrome context-menu saving
* 🔐 Local-first personal data model

---

# 🏠 + ☁️ Dual Library Architecture

Charlie MJ Tool Archive v5.0.0 treats the Local and Remote default libraries as **two independent resources**.

```text
                    CHARLIE MJ TOOL ARCHIVE
                              │
               ┌──────────────┴──────────────┐
               │                             │
        🏠 LOCAL LIBRARY              ☁️ REMOTE LIBRARY
               │                             │
               │                             │
 data/default-tools.json          GitHub/default-tools.json
               │                             │
               └──────────────┬──────────────┘
                              ↓
                     🔗 UNIFIED LIBRARY
                              │
                  ┌───────────┼───────────┐
                  ↓           ↓           ↓
               LOCAL       REMOTE     LOCAL + REMOTE
```

The two sources remain independent while the extension provides a unified view.

---

# 🏠 Local Default Library

The extension package contains:

```text
data/default-tools.json
```

The Local Default Library provides:

* An offline library
* A packaged/default resource
* A fallback when GitHub is unavailable
* A starting point for the local extension library

Local personal information such as favorites, notes, usage history, and local customizations is stored separately from the packaged default resource.

---

# ☁️ Remote GitHub Library

The extension can read the project's public GitHub:

```text
data/default-tools.json
```

The Remote Library acts as a shared/default resource that can be updated independently from the installed extension.

The remote library is cached locally so the extension can continue working if GitHub is temporarily unavailable.

No GitHub login is required to read a public default library.

---

# 🔗 Unified Library

The Local and Remote libraries are combined into a single Unified Library.

If a website exists only locally:

```text
🏠 LOCAL
```

If it exists only remotely:

```text
☁️ REMOTE
```

If the same website exists in both sources:

```text
🏠 LOCAL + ☁️ REMOTE
```

The same website is displayed as **one unified card**, rather than two duplicate cards.

---

# 🏷️ Source Badges

Every unified tool can display its source.

## Local Only

```text
🏠 LOCAL
```

The tool exists in the Local Default Library but not in the Remote Library.

## Remote Only

```text
☁️ REMOTE
```

The tool exists in the Remote GitHub Library but not in the Local Library.

## Local + Remote

```text
🏠 LOCAL + ☁️ REMOTE
```

The tool exists in both libraries.

This source information is available throughout the extension, including tool cards, details, search/filter results, and library comparison.

---

# 🔎 Source Filtering

The Unified Library provides source filtering:

```text
All
Local
Remote
Local + Remote
```

This allows you to quickly answer questions such as:

* Which tools are only in my local library?
* Which tools came from GitHub?
* Which tools exist in both libraries?
* What resources were added remotely?

---

# ⇄ Library Comparison

The extension includes a **Library Comparison** feature for comparing Local and Remote resources.

It can show:

```text
Local Only
Remote Only
Local + Remote
Remote Changes
```

This provides a clear view of differences between the two default libraries before making publishing or synchronization decisions.

---

# 🔄 GitHub Synchronization

The extension supports automatic synchronization with the Remote GitHub Library.

Synchronization can occur:

* Automatically when the extension starts
* Manually through **Settings → Sync from GitHub Now**
* Periodically while Chrome is active
* According to the configured synchronization interval

Available synchronization intervals:

```text
15 minutes
30 minutes
1 hour
6 hours
Daily
```

Automatic synchronization can also be disabled.

---

# 🔄 Sync Behavior

When a new website is added to the Remote GitHub Library, the extension can detect it during synchronization.

For example:

```text
GitHub
   ↓
default-tools.json
   ↓
Remote Library
   ↓
GitHub Sync
   ↓
Unified Library
```

A remote-only website appears as:

```text
☁️ REMOTE
```

If the same normalized website already exists locally:

```text
🏠 LOCAL + ☁️ REMOTE
```

The extension does not create a second card for the same website.

---

# 🕘 Sync History

The extension records recent synchronization activity.

Example:

```text
✓ + New
↻ Updated
− Removed remotely
```

Sync history helps you understand what happened during each GitHub synchronization.

---

# 🛡️ Remote Deletion Protection

GitHub is treated as a shared/default source, while Local data is treated as personal.

Therefore, if a website is removed from the Remote GitHub Library, the extension does **not automatically delete the local record**.

Example:

```text
Remote
Example Tool ❌

Local
Example Tool ✓
```

The local record can remain available.

This prevents an accidental GitHub change from deleting personal information.

---

# ＋ Create Local Copy

A Remote-only tool can be converted into a personal Local record.

Example:

```text
☁️ REMOTE
Example Tool
```

Choose:

```text
Create Local Copy
```

The result becomes:

```text
🏠 LOCAL + ☁️ REMOTE
```

The local copy can then be customized without pretending that the GitHub source itself was modified.

---

# 🧩 Local Personal Data

Personal local information is kept separate from the default libraries.

Examples include:

* Favorites
* Private notes
* Usage history
* Usage count
* Last used date
* Local customizations
* Local overrides

Remote synchronization should not blindly overwrite this personal information.

---

# 🧹 Duplicate Protection

The archive includes URL normalization and duplicate detection.

The system compares websites using normalized URLs so common variations can be recognized as the same resource.

For example:

```text
https://example.com
https://example.com/
https://example.com/?utm_source=test
```

can resolve to the same canonical website for duplicate comparison.

Meaningful paths remain distinct:

```text
https://example.com/tools
https://example.com/download
```

The goal is to prevent accidental duplicate entries while preserving genuinely different resources.

---

# 🧹 Duplicate Cleanup

Existing library data can be checked for duplicate records.

The duplicate manager can identify possible duplicate websites and help clean the library.

The system can distinguish:

* Exact/canonical duplicates
* Similar tools
* Different resources on the same domain

A similar website is **not automatically treated as a duplicate**.

---

# 🧠 Smart Library Features

## Smart Add Tool

When adding a new website, the extension provides:

* Duplicate URL warning
* URL normalization
* Existing category autocomplete
* Category counts
* Recently used categories
* Create-new-category option
* Smart tag suggestions
* Similar-tool warning
* Description field
* Personal notes

Example:

```text
Category
[ Instagram... ]

Suggestions:

📱 Instagram Tools       18
📱 Social Media Tools    12

💡 Recommended:
Instagram Tools
```

---

# 🗂️ Category Manager

The Category Manager allows you to organize your library.

Supported operations include:

* Create category
* Rename category
* Merge categories
* Delete category
* Reassign tools
* View category counts
* Organize tools into better categories

The category system is designed to prevent unrelated tools from being placed into overly broad categories.

---

# 🏷️ Smart Tags

The extension can suggest tags based on information such as:

* Tool name
* URL
* Description
* Category

Example:

```text
Instagram
Stories
Downloader
Social Media
```

Suggested tags can be accepted or ignored.

---

# 🔎 Similar Tool Detection

When adding a new website, the extension can warn about similar existing resources.

Example:

```text
🔎 Similar tools already exist

Instagram Story Viewer
StorySaver
Instagram Stories Downloader

[View Similar Tools]
[Continue Anyway]
```

Similar tools are not automatically considered duplicates.

---

# 🔎 Advanced Search

The archive supports normal search and structured search.

Examples:

```text
instagram
```

```text
category:Instagram
```

```text
tag:download
```

```text
favorite:true
```

```text
type:Website
```

```text
used:recent
```

Search can be combined with source filtering.

---

# ☑️ Bulk Actions

Multiple local records can be selected for bulk operations.

Available actions include:

* Move category
* Add tags
* Favorite
* Export
* Remove local records

This makes large libraries easier to maintain.

---

# 📥 Import Preview

Before importing a large collection, the extension can analyze the data first.

The preview can identify:

* New tools
* Existing tools
* Possible duplicates
* Missing categories
* Similar tools

This gives you an opportunity to review the import before committing changes.

Supported imports include:

* JSON
* Chrome bookmarks HTML

---

# 🩺 Library Health

The Library Health section provides local diagnostics.

It can identify:

* Total local tools
* Category count
* Duplicate records
* Missing descriptions
* Uncategorized tools
* Invalid URLs
* Never-used tools

Remote differences are handled separately through **Library Comparison**.

---

# 🌐 Website Health Checker

A manual website health checker can test saved websites.

Possible results include:

```text
✓ Working
⚠ Warning / Blocked
✕ Failed
```

Some websites block automated requests.

Therefore, a warning or failed automated check does not necessarily mean that the website is unavailable in a normal browser.

---

# 💾 Backup & Restore

The extension provides multiple backup and export options.

Supported operations include:

* JSON backup
* JSON restore
* CSV export
* Detailed offline HTML export
* Restore bundled defaults
* JSON import
* Chrome bookmark import
* Import preview

The detailed HTML export is designed to provide a readable offline archive of the tool collection.

---

# 🌐 Detailed HTML Export

The HTML export can include:

* Tool name
* URL
* Category
* Type
* Description
* Tags
* Notes
* Favorite status
* Date added
* Last modified
* Last used
* Usage count
* Source information

The resulting HTML archive can be stored locally or shared as a standalone reference.

---

# 🐙 Publishing the Local Library to GitHub

Local library changes can be prepared for GitHub publishing.

Use:

```text
Settings
   ↓
Prepare GitHub Update
```

The extension creates a GitHub-ready:

```text
default-tools.json
```

without unnecessary personal runtime information such as:

* Private notes
* Favorites
* Usage history
* Runtime-only fields

Recommended workflow:

```text
Local changes
      ↓
Prepare GitHub Update
      ↓
default-tools.json
      ↓
Review
      ↓
Commit / Push to GitHub
      ↓
Remote GitHub Library
      ↓
Other installations synchronize
```

This keeps the GitHub library suitable as a shared/default resource.

---

# 🔐 Local-First Architecture

The extension is designed around a Local-First model.

```text
Bundled Local Library
        +
Cached Remote Library
        +
Personal Local Data
        ↓
     Library Engine
        ↓
   Unified Dashboard
```

If GitHub is unavailable, the extension can continue using the locally available data and cached Remote Library.

Your personal library does not depend entirely on an active GitHub connection.

---

# 📊 Usage Statistics

The extension can track local usage information such as:

* Usage count
* Last used date
* Recently used tools

This makes frequently used resources easier to find.

---

# ⭐ Favorites

Tools can be marked as favorites.

Favorites can then be filtered independently from the complete library.

---

# 🕘 Recently Used

Recently opened websites can be found through the Recently Used section.

This is useful for frequently accessed development, learning, AI, productivity, and other resources.

---

# 🖱️ Chrome Context Menu

The extension provides a Chrome context-menu action for saving websites.

Example:

```text
Right Click
    ↓
Save to Charlie MJ Tool Archive
```

The website can then be added to the local archive.

---

# 🌙 Themes

Supported appearance modes:

* System
* Light
* Dark

The extension is designed around a modern dark/neon visual style while supporting different display preferences.

---

# 📐 Grid Density

The tool dashboard supports:

* Comfortable
* Compact

This allows large libraries to be displayed efficiently.

---

# 🎨 UI Design

Charlie MJ Tool Archive uses a modern visual design based around:

* Glassmorphism
* Dark navy/blue backgrounds
* Neon-style gradients
* Rounded cards
* Colorful category indicators
* Modern dashboard layout
* Responsive tool cards
* Source badges
* Clear navigation

The goal is to make a large tool collection feel more like a modern application/library than a traditional bookmark manager.

---

# 📁 Project Structure

```text
charlie-mj-tool-archive/
│
├── data/
│   └── default-tools.json
│
├── docs/
│   ├── CHARLIE-MJ-TOOL-ARCHIVE.md
│   ├── DATA-FORMAT.md
│   └── V5.0.0-DUAL-LIBRARY.md
│
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── logo.svg
│
├── src/
│   ├── background.js
│   ├── dashboard.html
│   ├── dashboard.js
│   └── styles.css
│
├── manifest.json
├── LICENSE
└── README.md
```

---

# 🔐 Permissions

The extension uses Chrome permissions for functionality such as:

```text
storage
bookmarks
tabs
contextMenus
alarms
```

These support:

* Local library storage
* Chrome bookmark integration
* Opening tools
* Context-menu saving
* Scheduled synchronization

Host permissions are used for:

* Public GitHub library access
* Manual website health checking

No GitHub login is required to read a public GitHub default library.

---

# 🛠️ Install as an Unpacked Extension

## 1. Download or clone the repository

Download this repository and extract it locally.

## 2. Open Chrome

Visit:

```text
chrome://extensions/
```

## 3. Enable Developer Mode

Turn on:

```text
Developer mode
```

## 4. Load the extension

Select:

```text
Load unpacked
```

## 5. Select the project directory

Choose the folder containing:

```text
manifest.json
```

## 6. Open Charlie MJ Tool Archive

The extension should now appear in Chrome.

After changing source files, use:

```text
Reload
```

on the extension card.

---

# ⌨️ Keyboard Shortcuts

Available shortcuts include:

```text
Ctrl + Shift + L
```

Open Charlie MJ Tool Archive.

```text
Ctrl + K
```

Focus the search field.

---

# 🐙 GitHub Workflow

The intended v5 workflow is:

```text
                  GitHub Repository
                         │
                         │
              default-tools.json
                         │
                         ↓
                ☁️ Remote Library
                         │
                         ↓
                   Remote Cache
                         │
                         │
🏠 Local Library ────────┤
                         ↓
                  🔗 Unified Library
                         │
             ┌───────────┼───────────┐
             ↓           ↓           ↓
          Search      Category     Favorites
             │           │           │
             └───────────┼───────────┘
                         ↓
                   Chrome Extension
```

For publishing:

```text
Chrome Extension
       ↓
Local Library
       ↓
Prepare GitHub Update
       ↓
default-tools.json
       ↓
GitHub
       ↓
Remote Library
       ↓
Other installations
       ↓
Automatic synchronization
```

---

# 📚 Documentation

Detailed documentation is available in the `docs` directory.

### Main project documentation

```text
docs/CHARLIE-MJ-TOOL-ARCHIVE.md
```

### Data format

```text
docs/DATA-FORMAT.md
```

### v5 Dual Library Architecture

```text
docs/V5.0.0-DUAL-LIBRARY.md
```

The v5 architecture document covers:

* Local library
* Remote library
* Unified library
* Source badges
* Source filtering
* URL normalization
* Duplicate handling
* GitHub synchronization
* Sync history
* Remote change detection
* Remote deletion protection
* Local copies
* Library comparison
* GitHub publishing
* Remote caching
* Local-first behavior
* Backup/export
* v5 feature architecture

---

# 📦 Version

**Charlie MJ Tool Archive v5.0.0**

### Dual Library + Unified Source-Aware Smart Archive

```text
🏠 Local
     +
☁️ Remote
     ↓
🔗 Unified
     ↓
🧠 Smart Library
```

---

# 📜 License

This project is open source and distributed under the license included in:

```text
LICENSE
```

---

# 👨‍💻 Project

**Charlie MJ Tool Archive**

A personal, local-first Chrome extension for building, organizing, discovering, maintaining, and sharing a large collection of useful online resources.

The project is designed to evolve from a simple bookmark archive into a **source-aware personal tool library and knowledge resource manager**.


## Independent category databases (v6.0.1)

The live local database now uses IndexedDB (`CharlieMJToolArchiveDB`). Each category and subcategory is stored as an independent logical collection. Tool records are assigned to exactly one leaf collection; parent collections do not duplicate child records. The legacy `localLibrary` Chrome Storage value is maintained as a compatibility mirror for existing v5 features and background integrations.

The packaged seed database is split into individual JSON collection files under `data/database/`: `database-config.json`, `categories-index.json`, `categories/<category>.json`, and `subcategories/<parent>/<subcategory>.json`. These files are portable seed/backup representations; they are not continuously writable files inside the installed extension. Chrome extensions cannot silently create or update arbitrary files in their installation directory. Use Database Manager to export one collection as JSON or all collections as a ZIP archive containing separate JSON files.

Database Manager supports per-category JSON export/restore, multi-file JSON import, folder import, ZIP import/export, full JSON backup, and the legacy v5 library export. ZIP archives include the category index and one JSON file per category/subcategory.


## v6.0.2 — Dedicated Settings Center

Version 6.0.2 adds a standalone, full-page Settings Center opened from the dashboard gear button. Settings are organized into independent navigation tabs: General, Database, Categories, Subcategories, Smart Search, Chrome Omnibox, Duplicate Detection, Import & Export, Collections, Tool Health, Usage Analytics, Keyboard Shortcuts, Privacy, and Advanced. The responsive two-column card grid includes independent module switches, editable preferences, save/discard/reset controls, and settings JSON import/export.

Open the archive and select the gear icon in the top-right corner to open Settings in its own tab. Use **Save changes** to persist preferences in `chrome.storage.local`. Database Manager and Chrome shortcut management are available through contextual quick actions.

The settings schema is additive and retains existing v6.0.1 settings. Controls that describe planned or independently configurable behavior are stored as preferences; a toggle is not represented as a completed runtime feature unless the corresponding module currently reads and enforces it. Core add/edit/delete, existing library storage, local/remote library separation, and database workflows remain available.

## v6.1.0 — Hybrid Portable Database

The existing Chrome Storage + IndexedDB architecture remains the primary application store. v6.1.0 adds an optional portable JSON persistence layer: authorize a normal local folder from Database Manager to automatically maintain separate category/subcategory JSON files, profile-data.json, indexes, manifests, collections, and dated backups. An optional Native Messaging companion host can write the same data to a configured folder. On the original PC, connect a portable folder while your personal tools are still present. Copy that separate data folder to the second PC, then choose it in Database Manager. v6.1.2 reads the existing profile and asks to merge it before writing, so a smaller fresh library cannot overwrite the larger portable copy.

See [Hybrid Portable Database v6.1.2](docs/PORTABLE-DATABASE-V6.1.2.md) and [Native Messaging setup](native-messaging/README.md). Chrome extensions cannot modify their own installed package directory; the portable database must live in a separate folder.


## v6.1.2 — Portable Restore & Settings Hotfix

Fixes the Settings renderer crash (`path.split is not a function`) by rendering individual control definitions and validating setting paths. Adds a Database & Storage tab. Most importantly, connecting an existing portable folder now reads and offers to merge its profile before any write; Native Messaging supports chunked profile reads too. This prevents a clean PC with only bundled defaults from overwriting a larger portable library before restoration. Existing Chrome Storage, IndexedDB, packaged defaults, and library features remain in place.


### Important cross-PC transfer procedure

1. **Original PC:** Do not uninstall or remove the extension before exporting/synchronizing. Open Database Manager → Portable Database → Choose Portable Data Folder and select a separate folder (for example `Documents/Charlie-MJ-Portable-Data`). If it is empty, the extension creates `profile-data.json` with the complete current local library, categories, collections, and settings.
2. Wait until the status reports a successful synchronization. Confirm `profile-data.json` contains the expected tool count.
3. Copy the entire `Charlie-MJ-Portable-Data` folder to the second PC (USB, network share, or another file-transfer method). Copying only the extension folder does not include Chrome profile storage.
4. **Second PC:** Load the extension, open Database Manager → Choose Portable Data Folder, and select the copied data folder. v6.1.2 detects the existing profile and asks to merge before syncing. Accept the merge to restore personal tools; do not select a new empty folder.
5. If using Native Messaging, install the helper on each PC and configure its local data-folder path. Use Test Native Helper; it now reads and offers to merge an existing profile before writing.

If the extension was already uninstalled on the original PC before any backup was created, Chrome may have removed that extension's local storage. The package cannot reconstruct those personal tools; recover them from an existing JSON/ZIP backup, another browser profile, or another PC where the old library still exists.


## v6.2.0 — Staging queue + verified category database

New and imported tools enter a durable **staging queue**, are validated and categorised, written to per-category JSON files (stable ID file names) and verified by read-back before leaving the queue. The 330 packaged defaults now live in `data/database/categories/*.json` (`data/default-tools.json` is only a pointer). Database Manager gains a **Migration Manager**, **Transfer Readiness Check**, **Database Files** table and **Reconcile Databases**. See `docs/CHANGELOG-V6.2.0.md` and `docs/STAGING-AND-CATEGORY-DATABASE-V6.2.0.md`.
