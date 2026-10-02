# Charlie MJ Tool Archive — Data Format

`data/default-tools.json` is the portable seed/snapshot format. The live extension database is kept in Chrome local storage.

## Tool record

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

## Important fields

- `id` — unique record identifier.
- `name` — display name.
- `url` — website URL.
- `category` — current user-facing category.
- `type` — Website, Developer, AI, Project, GitHub, Learning or Utility.
- `tags` — searchable labels.
- `description` — short useful description shown on cards/details.
- `notes` — personal notes; preserved during GitHub sync.
- `favorite` — local favorite state.
- `addedAt` — creation timestamp.
- `lastModified` — last local edit timestamp.
- `lastUsed` — most recent open timestamp.
- `usageCount` — number of recorded opens.
- `source` — bundled, github, import or local.
- `githubFingerprint` — internal remote-data fingerprint.
- `githubSyncedAt` — last GitHub enrichment timestamp.

## Duplicate handling

The extension normalizes URLs before comparing them. It removes common tracking parameters and fragments, normalizes the host, and normalizes trailing slashes. Query variations that represent the same saved page are treated as the same archive record during cleanup/sync.

When duplicates are found, the extension keeps one record and combines useful metadata such as tags, notes, favorites and usage history.

## GitHub sync rules

GitHub is treated as a **default-library source**, not the live personal database.

When GitHub contains a new URL:

```text
GitHub record → new local record
```

When the URL already exists:

```text
GitHub metadata → fill missing local information
Personal notes/favorites/usage → stay local
```

This makes it safe to publish new default tools without destroying personal archive data.
