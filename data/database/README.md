# Packaged default library (read-only)

`categories/*.json` holds the packaged default tools, one file per category (330 tools / 71 categories).
`category-index.json` lists category IDs, hierarchy and file paths; `database-manifest.json` lists every file with its record count and SHA-256.
`../default-tools.json` is only a small pointer to this manifest — it no longer contains the tools.

Chrome cannot modify these packaged files at runtime. Your own tools are stored in IndexedDB and written to `user-data/` (see docs/STAGING-AND-CATEGORY-DATABASE-V6.2.0.md).
After editing a file here, run `python scripts/build-default-manifest.py` to refresh the index, manifest and pointer.
