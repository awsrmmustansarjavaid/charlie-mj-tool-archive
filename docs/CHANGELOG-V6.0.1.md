# v6.0.1 — Independent Category Databases

- Added IndexedDB runtime database with independent category/subcategory collections.
- Added transactional collection writes and category-level updates.
- Startup reads initialized IndexedDB collections and preserves a v5-compatible `localLibrary` mirror.
- Category ZIP export now writes a separate JSON file for every category and subcategory, with hierarchical folder paths.
- Added a split seed database under `data/database/` generated from the bundled 330-tool v5 library (71 categories).
- Added database format and Chrome filesystem limitation documentation.
- Kept the existing v5 Local/Remote libraries and legacy JSON import/export contract.
