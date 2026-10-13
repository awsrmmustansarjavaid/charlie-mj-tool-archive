# Split category database seed files

This directory contains one JSON collection file per category from the bundled `../default-tools.json` library.

- `database-config.json`: format and seed metadata.
- `categories-index.json`: category UUIDs, display IDs and hierarchy metadata.
- `categories/*.json`: one top-level category collection per file.
- `subcategories/<parent>/*.json`: nested category collection export location (created when subcategories are present).
- `backup-manifest.json`: file and record inventory.

The files in this folder are a portable seed/export representation. Live changes are stored in the extension's IndexedDB database. Use the Database Manager to download current JSON collections or a complete ZIP archive; Chrome does not permit an extension to silently rewrite files inside its installed directory.
