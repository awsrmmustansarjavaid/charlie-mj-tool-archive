#!/usr/bin/env python3
"""Rebuild data/database/category-index.json and database-manifest.json from
data/database/categories/*.json, and (re)write the small compatibility file
data/default-tools.json. Run after editing any packaged default category file.
  python scripts/build-default-manifest.py
"""
import json, glob, os, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, 'data', 'database')
VERSION = open(os.path.join(ROOT, 'VERSION')).read().strip()

def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()

entries, files, total = [], [], 0
for path in sorted(glob.glob(os.path.join(DB, 'categories', '*.json'))):
    j = json.load(open(path, encoding='utf-8'))
    rel = 'categories/' + os.path.basename(path)
    cat = j['category']
    count = len(j.get('tools', []))
    j['recordCount'] = count
    json.dump(j, open(path, 'w', encoding='utf-8', newline='\n'), indent=2, ensure_ascii=False)
    total += count
    entries.append({**cat, 'path': rel, 'recordCount': count})
    files.append({'path': rel, 'recordCount': count, 'sha256': sha(path)})
entries.sort(key=lambda c: c['name'].lower())
json.dump({'version': VERSION, 'app': 'Charlie MJ Tool Archive', 'categories': entries},
          open(os.path.join(DB, 'category-index.json'), 'w', encoding='utf-8', newline='\n'), indent=2, ensure_ascii=False)
json.dump({'version': VERSION, 'app': 'Charlie MJ Tool Archive', 'format': 'default-library-manifest',
           'role': 'packaged-read-only-default-library', 'categoryCount': len(entries), 'toolCount': total,
           'categoryIndex': 'database/category-index.json', 'files': files},
          open(os.path.join(DB, 'database-manifest.json'), 'w', encoding='utf-8', newline='\n'), indent=2, ensure_ascii=False)
json.dump({'version': VERSION, 'app': 'Charlie MJ Tool Archive', 'format': 'default-library-pointer',
           'tools': [], 'libraryManifest': 'database/database-manifest.json',
           'categoryCount': len(entries), 'toolCount': total,
           'note': 'The packaged default library lives in data/database/categories/*.json. This file is only a small compatibility pointer; it no longer holds the tools.'},
          open(os.path.join(ROOT, 'data', 'default-tools.json'), 'w', encoding='utf-8', newline='\n'), indent=2, ensure_ascii=False)
print(f'{len(entries)} categories, {total} tools')
