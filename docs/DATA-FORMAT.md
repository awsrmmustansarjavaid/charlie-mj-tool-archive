# Charlie MJ Tool Archive v5.0.0 — Data Format

## Default library format

`data/default-tools.json` is the portable default-library snapshot format.

Both the packaged Local Default Library and the GitHub Remote Library use the same top-level structure:

```json
{
  "version": "5.0.0",
  "app": "Charlie MJ Tool Archive",
  "exportedAt": "2026-10-02T00:00:00.000Z",
  "tools": []
}
```

The extension's live personal data is stored separately in Chrome local storage.

## Tool record

```json
{
  "id": "cmj-0001",
  "name": "Example Tool",
  "url": "https://example.com/",
  "category": "Developer Tools",
  "type": "Website",
  "tags": ["developer", "utility"],
  "description": "Short useful description."
}
```

Personal runtime fields may exist in local backups, but they are not required in the public GitHub default snapshot.

## Source model

The extension keeps two source collections:

```text
localLibrary
remoteLibrary
```

The dashboard derives the source state for each normalized URL:

```text
local only       → 🏠 LOCAL
remote only      → ☁️ REMOTE
both             → 🏠 LOCAL + ☁️ REMOTE
```

## URL normalization

For archive duplicate comparison the extension:

- normalizes protocol and hostname case
- removes the leading `www.` hostname prefix
- removes query strings
- removes URL fragments
- normalizes repeated slashes
- normalizes trailing slashes

Useful paths remain meaningful. For example:

```text
https://example.com/tools
https://example.com/download
```

remain separate records.

## Local personal metadata

The following information is treated as personal/local data:

- favorites
- notes
- usage count
- last-used timestamp
- local edits
- local copies of remote-only tools

Remote synchronization must not blindly replace these values.

## Remote synchronization metadata

Chrome local storage maintains synchronization state separately from the tool records, including:

- last synchronization time
- synchronization status
- remote tool count
- added count
- updated count
- removed count
- recent sync history
- most recent change summary

## GitHub publishing

**Prepare GitHub Update** creates a clean default snapshot from the local library.

Personal runtime fields are removed before the file is prepared for publication.

Recommended flow:

```text
Local Library
    ↓
Prepare GitHub Update
    ↓
data/default-tools.json
    ↓
Git commit / push
    ↓
Remote GitHub Library
```

## Duplicate handling

Duplicate URL records are merged locally before they are shown in the dashboard.

When the same normalized URL exists in Local and Remote, the dashboard shows one unified card with:

```text
🏠 LOCAL + ☁️ REMOTE
```

## Remote deletion safety

A record disappearing from GitHub does not authorize deletion of a local personal record.

This prevents remote library maintenance from destroying local information.
