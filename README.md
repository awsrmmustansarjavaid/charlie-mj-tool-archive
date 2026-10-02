# Charlie MJ Tool Archive

A colorful, local-first Chrome Extension (Manifest V3) for organizing tools, websites, AI services, developer resources, learning links, media tools, dictionaries, jobs, personal projects and bookmarks.

<p align="center">
  <img src="./assets/85d6b421-b702-43ab-aebc-1713e4747ca7.png" alt="Charlie MJ Tool Archive" width="600">
</p>

## Final Release

**Version:** 3.0.0

**Default library:** 290 unique tools

The bundled library combines the Charlie MJ collections supplied during development. The release also includes the key websites represented in the final UI concept: Udemy, GitHub, ChatGPT, Stack Overflow and YouTube.

---

## Main Features

- Neon glassmorphism Charlie MJ interface
- Colorful CM extension logo and 16/32/48/128px icons
- Full-page dashboard with responsive layout
- 290 bundled default tools
- Category sidebar with counts
- Search across names, URLs, categories, descriptions, notes and tags
- Favorites
- Recently used
- Recently added sorting
- Type filtering
- Open any tool in a new Chrome tab
- Open all visible tools
- Details button with complete tool information
- Three-dot action menu
- Edit / Update tool
- Add to / remove from Favorites
- Delete tool
- Add new tool
- Duplicate URL protection
- Import Chrome bookmarks HTML
- Import JSON
- Export JSON backup
- Export CSV
- Restore Default Library without replacing personal edits
- Light / Dark / System theme
- Comfortable / Compact grid
- Local-first `chrome.storage.local` storage
- Chrome context menu: **Save to Charlie MJ Tool Archive**
- Keyboard shortcut: **Ctrl + Shift + L** to open the archive
- **Ctrl + K** to focus search
- Automatic default-library migration on extension update
- Favicon with fallback initials
- Responsive mobile layout

---

## Install Locally

1. Extract the ZIP.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `charlie-mj-tool-archive` folder.
6. Click the Charlie MJ extension icon.

---

## Updating

The extension merges missing bundled tools into the existing local library. It does not intentionally replace your personal edits, favorites, notes or usage history.

Use **Settings → Restore Default Library** whenever you want to add any bundled entries that are missing from your current library.

---

## Project Structure

```text
charlie-mj-tool-archive/
├── manifest.json
├── README.md
├── LICENSE
├── .gitignore
├── data/
│   └── default-tools.json
├── docs/
│   └── DATA-FORMAT.md
├── icons/
│   ├── logo.svg
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── background.js
    ├── dashboard.html
    ├── dashboard.js
    └── styles.css
```


---

## Privacy / Data

The core library is stored locally in Chrome extension storage. No backend or account is required for the core extension.

Export a JSON backup before moving to another Chrome profile or browser.

---

## Where Are New Tools / Bookmarks Stored?

When I add a new website, tool, bookmark, or resource to **Charlie MJ Tool Archive**, it is stored in the extension's **tool data/configuration file**.

For example, if your extension uses `default-tools.json`, the new entry should be added there:

```text
Charlie-MJ-Tool-Archive/
├── manifest.json
├── default-tools.json   ← Tools/bookmarks are stored here
├── popup.html
├── popup.js
├── styles.css
├── assets/
└── ...
```

### GitHub Update Workflow

Because `default-tools.json` is part of the project, any new tool I add should also be reflected in GitHub.

```text
Add New Website / Tool
        ↓
Update default-tools.json
        ↓
Test the extension
        ↓
Commit changes
        ↓
Push to GitHub
        ↓
GitHub contains the latest tool list
```

### Important: Default Tools vs. User-Added Tools

If your extension currently stores newly added tools **only in Chrome's local storage (`chrome.storage.local`)**, those tools will **not automatically appear in GitHub**.

In that case:

* `default-tools.json` → version-controlled default tool collection
* `chrome.storage.local` → user's personal/local additions
* GitHub → only contains files that you commit and push

So, if you want **every new tool you add to become part of the official GitHub version**, your project should have a clear workflow where the new tool is added to `default-tools.json` and then committed to GitHub.

### Recommended Structure for Charlie MJ Tool Archive

I recommend treating `default-tools.json` as your **master tool catalog**:

```text
default-tools.json
        ↓
Official list of tools/bookmarks
        ↓
GitHub repository
        ↓
New extension installation
```

This makes it easy to keep your **Chrome Extension and GitHub repository synchronized**.

---

## License

MIT License. See `LICENSE`.

---

## Importing JSON

1. Open the extension dashboard.
2. Click **Settings**.
3. Choose **Import JSON**.
4. Select a JSON file containing either a plain array of tools or an object with a `tools` array.
5. The extension merges tools by normalized URL and keeps existing bookmarks.

A ready-to-import file is included with this release as `charlie-mj-new-bookmarks-import.json` outside the extension package.

---
>>>>>>> 39c6e33 (Release Charlie MJ Tool Archive 3.0.0)
