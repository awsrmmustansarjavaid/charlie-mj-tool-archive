# ✨ Charlie MJ Tool Archive v5.0.0

## Smart Library Chrome Extension

> **v5 architecture note:** See `V5.0.0-DUAL-LIBRARY.md` for the complete Local + Remote library model, source badges, comparison, sync history and remote-safety rules.

**Charlie MJ Tool Archive** is a modern Manifest V3 Chrome extension for organizing a large personal collection of websites, online tools, learning resources, AI services, developer utilities, social-media tools, productivity sites and other bookmarks.

The extension is designed as a **local-first personal tool library** while also supporting a public GitHub repository as the source for the bundled/default tool collection.

---

## 📦 Version

**Version:** `5.0.0`

**Project:** Charlie MJ Tool Archive

**Repository:**

`https://github.com/awsrmmustansarjavaid/charlie-mj-tool-archive`

**Default library file:**

`data/default-tools.json`

---

# 🚀 What Is Charlie MJ Tool Archive?

Instead of keeping hundreds of websites inside ordinary browser bookmarks, Charlie MJ Tool Archive provides a searchable visual library.

The extension lets you:

- Save websites and online tools.
- Organize tools into categories.
- Search across names, URLs, descriptions, notes and tags.
- Mark important tools as favorites.
- Track recently used tools.
- Edit tool information.
- Detect duplicate websites.
- Find similar tools.
- Import existing bookmarks.
- Export and back up the library.
- Manage categories.
- Synchronize new default tools from GitHub.

The goal is to make a large personal tool collection easier to browse, maintain and reuse.

---

# ☁️ GitHub → Extension Synchronization

One of the main v4.0.0 features is automatic synchronization with the project's public GitHub repository.

The extension reads the repository's default library file:

```text
https://github.com/awsrmmustansarjavaid/charlie-mj-tool-archive
        ↓
data/default-tools.json
```

The GitHub file acts as the **remote default-library source**.

## How it works

```text
GitHub
   │
   │ default-tools.json
   ↓
GitHub Sync
   ↓
Duplicate / URL normalization
   ↓
Chrome local storage
   ↓
LIVE TOOL LIBRARY
```

If a new website is added to GitHub's `default-tools.json`, the extension can discover it during synchronization and add it to the local library.

### Example

Suppose this record is added to GitHub:

```json
{
  "name": "New Awesome Tool",
  "url": "https://example.com/",
  "category": "Developer Tools",
  "type": "Website",
  "tags": ["developer", "utility"],
  "description": "A useful developer utility."
}
```

After GitHub synchronization, the new tool becomes available in the extension's local library.

## Automatic synchronization

GitHub synchronization is designed to run automatically while the extension is active.

The extension also provides a manual option:

**Settings → Sync from GitHub Now**

This is useful when a new tool was just published and you want to request a synchronization immediately.

## Non-destructive synchronization

GitHub is **not** treated as the user's personal database.

The extension keeps the live personal library in Chrome local storage.

During synchronization:

- New GitHub tools are added.
- Existing local favorites are preserved.
- Personal notes are preserved.
- Usage history is preserved.
- Local edits are not blindly replaced.
- Missing descriptions/tags can be enriched from GitHub data.
- Duplicate URLs are merged instead of being added twice.

This prevents a GitHub update from accidentally destroying personal library information.

---

# 🧹 Duplicate Website Cleanup

The extension includes duplicate detection and cleanup.

This applies both to the existing library and to future additions/imports/synchronization.

## Duplicate URL normalization

URLs are normalized before comparison. Common differences such as:

- trailing slashes
- common tracking parameters
- irrelevant fragments
- host normalization

can be ignored when determining whether two records represent the same saved website.

For example, multiple saved variations of the same website can be recognized as one archive record.

## Metadata preservation

When duplicate records are merged, useful information can be combined, including:

- Tags
- Notes
- Favorite state
- Usage information
- Descriptions
- Other available metadata

The goal is to remove duplicate records without unnecessarily losing useful personal information.

---

# 📝 Missing Details Improvement

The bundled library has been cleaned so that previously empty descriptions are populated with short, useful descriptions where information was available from the saved tool data.

The library also supplements missing tags where appropriate.

This makes the cards and search results more informative without requiring the user to manually describe every website.

---

# 🧠 Smart Add Tool

The Add Tool workflow is designed to make adding a new website faster and safer.

## Category autocomplete

When entering a category, the extension can suggest existing categories.

Suggestions can include:

- Existing category name
- Tool count
- Recently used categories
- A suggested matching category
- Option to create a new category

This helps prevent unnecessary category duplication.

## Smart tag suggestions

The extension can suggest useful tags based on the tool information, such as:

- Instagram
- YouTube
- Downloader
- Developer
- AI
- Social Media
- Learning

The user can select suggested tags or add their own.

## Duplicate warning

When a URL already exists, the extension can warn the user before creating another record.

The purpose is to prevent accidental duplicate websites from entering the library.

## Similar-tool warning

A website does not have to be an exact duplicate to be useful as a warning.

The extension can identify potentially similar tools based on information such as names, URLs and tags.

Similar tools can still be added because similarity does not automatically mean duplication.

---

# 🗂️ Category Manager

The Category Manager provides centralized category maintenance.

Available management operations include:

- Rename a category.
- Merge categories.
- Delete a category.
- Reassign tools when deleting a category.
- View category counts.

The category system is intended to keep the library organized as the number of tools grows.

---

# 🔎 Advanced Search

The extension supports normal search as well as structured search filters.

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

These filters can be combined to narrow a large library quickly.

---

# ☑️ Bulk Actions

Multiple tools can be selected for batch operations.

Supported actions include:

- Move to category
- Add tags
- Favorite
- Export
- Delete

Bulk actions are useful when cleaning or reorganizing a large collection.

---

# 🩺 Library Health

The Library Health area provides a quick overview of data quality.

It checks for items such as:

- Duplicate URL groups
- Missing descriptions
- Missing categories
- Invalid URLs
- Never-used tools
- Total tools
- Total categories

This makes it easier to maintain a clean archive as the collection grows.

---

# 🌐 Website Health Checker

A manual website health checker is included.

It can report states such as:

- Working
- Warning
- Failed / blocked

Some websites intentionally block automated requests. Therefore, a warning or failed automated request does not necessarily mean that the website is unavailable when opened normally in Chrome.

The checker is intended as a maintenance utility rather than a permanent monitoring service.

---

# 💾 Backup & Restore

The extension provides several ways to protect and export the library.

Available operations include:

- JSON backup
- JSON restore
- CSV export
- Detailed HTML export
- Restore bundled defaults

The JSON format is useful for restoring data into the extension.

CSV is useful for spreadsheet-style processing.

HTML export provides a readable standalone archive of the saved tools.

---

# 📥 Import Preview

The extension can import data from:

- JSON
- Chrome bookmark HTML

Before committing imported data, the workflow can identify information such as:

- New tools
- Already-existing tools
- Possible duplicates
- Missing categories
- Similar tools

This gives the user an opportunity to review the incoming data before adding it to the library.

---

# ⭐ Favorites

Important tools can be marked as favorites.

Favorites are stored locally and are preserved during GitHub synchronization.

---

# 🕘 Recently Used

The extension records when a tool is opened.

The library can use this information for recently used tools and usage-based search.

---

# 📊 Usage Statistics

Tool usage information can include:

- Usage count
- Last-used timestamp

This helps identify tools that are frequently opened and tools that have never been used.

---

# ↗️ Open Tools

Tools can be opened directly from the library.

The extension supports opening:

- Visible tools
- Selected tools

Opening a tool can update its local usage information.

---

# 🖱️ Chrome Context Menu Integration

The extension provides a Chrome right-click action for saving a website to Charlie MJ Tool Archive.

This allows a website to be added without manually opening the extension first.

---

# 🌙 Themes

The extension supports:

- System theme
- Light theme
- Dark theme

The interface uses the Charlie MJ visual style with a modern dashboard, colorful accents and glass-style cards.

---

# 📐 Grid Density

The tool library supports different card-density settings, including:

- Comfortable
- Compact

This helps users choose between larger visual cards and a denser tool list.

---

# 🎨 User Interface

The extension uses a modern dashboard design with:

- Dark navy/blue visual foundation
- Purple, blue and pink accent gradients
- Glassmorphism-style cards
- Rounded UI elements
- Category icons
- Search and filtering controls
- Tool cards
- Details/edit views

The design is intended to feel like a dedicated personal tool library rather than a basic bookmark manager.

---

# 🔐 Local-First Architecture

The live personal library is stored in Chrome extension local storage.

The important distinction is:

```text
GitHub default-tools.json
        ↓
Default / remote library source
        ↓
Chrome local storage
        ↓
Personal live library
```

`default-tools.json` is therefore a **seed/snapshot**, not the live writable database.

This architecture allows the extension to synchronize new default tools while keeping personal information local.

---

# 📁 Project Structure

```text
charlie-mj-tool-archive/
│
├── data/
│   └── default-tools.json
│
├── docs/
│   ├── DATA-FORMAT.md
│   └── CHARLIE-MJ-TOOL-ARCHIVE.md
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
├── assets/
├── manifest.json
├── LICENSE
├── README.md
└── .gitignore
```

---

# 📄 Data Format

The main default-library file is:

```text
data/default-tools.json
```

A typical record looks like:

```json
{
  "id": "cmj-0001",
  "name": "Example Tool",
  "url": "https://example.com/",
  "category": "Developer Tools",
  "type": "Website",
  "tags": ["developer", "utility"],
  "description": "Short useful description.",
  "notes": "Personal notes.",
  "favorite": false,
  "addedAt": 0,
  "lastModified": 0,
  "lastUsed": 0,
  "usageCount": 0,
  "source": "bundled",
  "githubFingerprint": "",
  "githubSyncedAt": 0
}
```

Personal notes, favorites and usage information are local concerns and are not intended to be replaced blindly by remote GitHub data.

For the detailed field specification, see:

`docs/DATA-FORMAT.md`

---

# 🔄 Recommended GitHub Workflow

The recommended workflow is:

### 1. Add a new default tool to GitHub

Edit:

```text
data/default-tools.json
```

### 2. Commit the change

Publish the updated file to the repository.

### 3. Open the extension

The extension can synchronize the updated default library automatically.

### 4. Or force synchronization

Use:

```text
Settings → Sync from GitHub Now
```

### 5. New records are merged locally

The extension compares normalized URLs and adds only new websites.

Existing local records are not blindly replaced.

---

# 🛠️ Installation

## Load the extension manually in Chrome

1. Download or clone the repository.
2. Extract the project if it is provided as a ZIP file.
3. Open Chrome.
4. Go to:

```text
chrome://extensions/
```

5. Enable **Developer mode**.
6. Click **Load unpacked**.
7. Select the project folder containing `manifest.json`.
8. Open **Charlie MJ Tool Archive**.

## After changing source files

Return to:

```text
chrome://extensions/
```

and click **Reload** on the extension card.

---

# 🔐 Extension Permissions

The extension uses permissions for its library and browser integrations, including:

- `storage` — local library and settings
- `bookmarks` — Chrome bookmark import/integration
- `tabs` — opening saved tools
- `contextMenus` — right-click save action
- `alarms` — periodic synchronization
- GitHub/web access — remote library synchronization and manual website-health checking

The GitHub synchronization reads the public repository and does not require a GitHub login for this public source.

---

# 🧭 Typical User Workflow

A typical workflow looks like this:

```text
Find a useful website
        ↓
Save to Charlie MJ Tool Archive
        ↓
Smart duplicate check
        ↓
Choose / create category
        ↓
Add suggested tags
        ↓
Tool appears in library
        ↓
Favorite / edit / add notes
        ↓
Open and use tool
        ↓
Usage information is stored locally
```

For GitHub-published default tools:

```text
Developer updates default-tools.json
        ↓
GitHub
        ↓
Extension GitHub Sync
        ↓
Duplicate check
        ↓
New tools added locally
        ↓
Existing personal data preserved
```

---

# 📌 Design Principles

Charlie MJ Tool Archive follows several core principles:

### Local-first

The user's live library is stored locally in Chrome.

### Non-destructive synchronization

Remote GitHub updates should not unnecessarily destroy personal library data.

### Duplicate-aware

The extension tries to prevent multiple records for the same website.

### Searchable

Tool information should be searchable through names, URLs, categories, descriptions, notes and tags.

### Maintainable

Library Health, category management, duplicate detection and backups help keep a growing collection organized.

### Portable

The JSON data format makes the library easier to back up, move and restore.

### GitHub-friendly

The default library can be maintained as a version-controlled JSON file in the project repository.

---

# 📦 Release

**Charlie MJ Tool Archive v5.0.0**

**Release focus:** Smart Library + GitHub Sync + Duplicate Cleanup + Library Management

---

## 👤 Project

**Charlie MJ**

GitHub repository:

`https://github.com/awsrmmustansarjavaid/charlie-mj-tool-archive`
