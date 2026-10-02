# Charlie MJ Tool Archive Data Format

The default library is a JSON array of tool objects.

Required fields:

- `id`
- `name`
- `url`
- `category`
- `type`

Optional fields:

- `tags`
- `description`
- `notes`
- `favorite`
- `lastUsed`
- `addedAt`

The extension also accepts an exported object containing a `tools` array.

Example:

```json
{
  "version": 2,
  "app": "Charlie MJ Tool Archive",
  "exportedAt": "2026-10-02T00:00:00.000Z",
  "tools": [
    {
      "id": "cmj-0001",
      "name": "Example",
      "url": "https://example.com/",
      "category": "Developer Tools",
      "type": "Developer",
      "tags": ["dev"],
      "description": "Example resource",
      "notes": "Personal note",
      "favorite": false,
      "lastUsed": 0,
      "addedAt": 1760000000000
    }
  ]
}
```
