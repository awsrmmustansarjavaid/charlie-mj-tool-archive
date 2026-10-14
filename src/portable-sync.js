/* Charlie MJ Tool Archive v6.2.0 — portable JSON database layer.
 *
 * Writes the personal database as real JSON files inside <extension folder>/user-data using either
 *   (A) a folder handle the user authorised (File System Access API), and/or
 *   (B) the optional Native Messaging helper.
 * Chrome never lets an extension modify its own packaged files silently, so everything is written to the
 * authorised folder; the packaged files (data/) are read-only defaults.
 *
 * Layout written under user-data/:
 *   profile-data.json                       full transferable profile
 *   database/categories/<categoryId>.json   one file per top-level category (stable ID file names)
 *   database/subcategories/<id>.json        one file per nested category
 *   database/category-index.json            id -> path, record count, sha256
 *   database/database-manifest.json         totals + sha256 + size of every file
 *   database/collections.json
 *   staging/pending-tools.json              durable staging queue mirror
 *   backups/                                dated + latest backups
 *
 * Every write is read back (or hashed by the helper) and compared before it is reported as saved.
 */
(() => {
  'use strict';
  const VERSION = '6.2.0', APP = 'Charlie MJ Tool Archive';
  const HANDLE_DB = 'CharlieMJPortableHandles', HANDLE_STORE = 'handles', HOST = 'com.charliemj.toolarchive';
  const QUEUE_KEY = 'cmjStagingQueueV1';
  const BACKUP_KEEP = 15;
  let nativePort = null, nativeChain = Promise.resolve();
  const writeCache = new Map(); // destination key -> Map(path -> sha256 last verified)
  const enc = new TextEncoder();

  /* ---------- small helpers ---------- */
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const byteLength = text => enc.encode(text).length;
  const safePart = s => String(s || '').replace(/[\\:*?"<>|]/g, '-').replace(/\.\./g, '-').slice(0, 120) || 'file';
  const urlKey = u => {
    if (window.CMJAdvanced?.exactUrl) return window.CMJAdvanced.exactUrl(u);
    return String(u || '').trim().toLowerCase().replace(/#.*$/, '').replace(/\/$/, '');
  };
  const parseJson = text => { try { return JSON.parse(text); } catch { return undefined; } };

  /* ---------- stored folder handle ---------- */
  function openHandleDb() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(HANDLE_DB, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(HANDLE_STORE)) r.result.createObjectStore(HANDLE_STORE); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function storeHandle(handle) {
    const db = await openHandleDb();
    await new Promise((res, rej) => { const tx = db.transaction(HANDLE_STORE, 'readwrite'); tx.objectStore(HANDLE_STORE).put(handle, 'portableRoot'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }
  async function getHandle() {
    const db = await openHandleDb();
    return new Promise((res, rej) => { const r = db.transaction(HANDLE_STORE).objectStore(HANDLE_STORE).get('portableRoot'); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); });
  }
  async function clearHandle() {
    const db = await openHandleDb();
    await new Promise((res, rej) => { const tx = db.transaction(HANDLE_STORE, 'readwrite'); tx.objectStore(HANDLE_STORE).delete('portableRoot'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }
  async function permission(h, write = true) {
    const opts = { mode: write ? 'readwrite' : 'read' };
    if (await h.queryPermission(opts) === 'granted') return true;
    return await h.requestPermission(opts) === 'granted';
  }
  async function getDataDirectory(root, create = false) {
    // The selected folder is the extension root (contains manifest.json); older setups selected user-data itself.
    try { await root.getFileHandle('manifest.json'); return await root.getDirectoryHandle('user-data', { create }); }
    catch (e) { if (e?.name === 'NotFoundError') return root; throw e; }
  }

  /* ---------- destinations: one interface for folder handle and native helper ---------- */
  function folderDestination(dataRoot, label) {
    const split = path => { const parts = path.split('/').map(safePart); return { dir: parts.slice(0, -1), file: parts.at(-1) }; };
    const dirAt = async (parts, create) => { let d = dataRoot; for (const p of parts) d = await d.getDirectoryHandle(p, { create }); return d; };
    return {
      kind: 'folder', label,
      async read(path) {
        try { const { dir, file } = split(path); const fh = await (await dirAt(dir, false)).getFileHandle(file); return await (await fh.getFile()).text(); }
        catch (e) { if (e?.name === 'NotFoundError' || e?.name === 'TypeMismatchError') return null; throw e; }
      },
      async write(path, content) {
        const { dir, file } = split(path);
        const fh = await (await dirAt(dir, true)).getFileHandle(file, { create: true });
        const w = await fh.createWritable(); await w.write(content); await w.close();
      },
      async remove(path) {
        try { const { dir, file } = split(path); await (await dirAt(dir, false)).removeEntry(file); } catch (e) { if (e?.name !== 'NotFoundError') throw e; }
      },
      async list(dirPath) {
        try { const d = await dirAt(dirPath.split('/').filter(Boolean).map(safePart), false); const names = []; for await (const [name, h] of d.entries()) if (h.kind === 'file') names.push(name); return names; }
        catch (e) { if (e?.name === 'NotFoundError') return []; throw e; }
      },
      async hashes(paths) {
        const out = {};
        for (const p of paths) { const t = await this.read(p); out[p] = t === null ? null : await sha256(t); }
        return out;
      }
    };
  }

  function nativeCall(message, timeoutMs = 30000) {
    const run = () => new Promise((resolve, reject) => {
      if (!chrome.runtime.connectNative) return reject(new Error('Native Messaging is not available'));
      if (!nativePort) {
        nativePort = chrome.runtime.connectNative(HOST);
        nativePort.onDisconnect.addListener(() => { nativePort = null; });
      }
      const port = nativePort;
      const onMessage = m => { clearTimeout(timer); port.onMessage.removeListener(onMessage); m?.ok ? resolve(m) : reject(new Error(m?.error || 'Native helper request failed')); };
      const timer = setTimeout(() => { port.onMessage.removeListener(onMessage); try { port.disconnect(); } catch {} nativePort = null; reject(new Error('Native helper timed out')); }, timeoutMs);
      port.onMessage.addListener(onMessage);
      try { port.postMessage(message); } catch (e) { clearTimeout(timer); nativePort = null; reject(e); }
    });
    const next = nativeChain.then(run, run);
    nativeChain = next.catch(() => {});
    return next;
  }
  function nativeDestination(root) {
    return {
      kind: 'native', label: root,
      async read(path) {
        let offset = 0, content = '';
        while (true) {
          const part = await nativeCall({ action: 'readFile', root, path, offset, limit: 120000 });
          if (!part.found) return null;
          content += part.content || '';
          if (part.eof) return content;
          offset = part.nextOffset;
          if (!Number.isFinite(offset)) throw new Error('Native helper returned an invalid file offset');
        }
      },
      async write(path, content) {
        if (content.length < 150000) { await nativeCall({ action: 'writeFile', root, path, content }); return; }
        await nativeCall({ action: 'writeFileStart', root, path });
        const chars = Array.from(content);
        for (let i = 0; i < chars.length; i += 150000) await nativeCall({ action: 'writeFileChunk', root, path, chunk: chars.slice(i, i + 150000).join('') });
        await nativeCall({ action: 'writeFileEnd', root, path });
      },
      async remove(path) { try { await nativeCall({ action: 'removeFile', root, path }); } catch (e) { if (!/Unsupported/i.test(e.message)) throw e; } },
      async list(dir) { try { return (await nativeCall({ action: 'listFiles', root, path: dir })).files || []; } catch (e) { if (/Unsupported/i.test(e.message)) return []; throw e; } },
      async hashes(paths) {
        try { return (await nativeCall({ action: 'hashFiles', root, paths })).hashes || {}; }
        catch (e) {
          if (!/Unsupported/i.test(e.message)) throw e; // older helper: fall back to reading each file back
          const out = {}; for (const p of paths) { const t = await this.read(p); out[p] = t === null ? null : await sha256(t); } return out;
        }
      }
    };
  }

  async function activeDestinations(settings, { forWrite = true } = {}) {
    const nativePath = String(settings?.portableNativePath || '').trim();
    const nativeEnabled = !!(settings?.portableNativeEnabled && nativePath);
    const handle = await getHandle();
    const list = { nativeEnabled, handle, native: null, folder: null, folderError: '' };
    if (nativeEnabled) list.native = { key: 'native:' + nativePath, dest: nativeDestination(nativePath) };
    if (handle) {
      try {
        if (await permission(handle, forWrite)) {
          const dataRoot = await getDataDirectory(handle, forWrite);
          list.folder = { key: 'folder:' + handle.name, dest: folderDestination(dataRoot, `${handle.name}/user-data`) };
        } else list.folderError = 'Folder permission was not granted';
      } catch (e) { list.folderError = e.message; }
    }
    return list;
  }

  /* ---------- building the file set ---------- */
  async function readQueue() { const r = await chrome.storage.local.get(QUEUE_KEY); return Array.isArray(r[QUEUE_KEY]) ? r[QUEUE_KEY] : []; }

  function categoryPath(node) { return node.parentId ? `database/subcategories/${safePart(node.id)}.json` : `database/categories/${safePart(node.id)}.json`; }

  async function buildFiles({ tools = [], remote = [], settings = {}, categories = [], collections = [], queue = [], backupLabel = '', createBackup = false, defaultKeys = null }) {
    const stamp = new Date().toISOString(), files = {}, meta = {};
    const nodes = Array.isArray(categories) ? categories : [];
    const byId = new Map(nodes.map(n => [n.id, n]));
    const leafOf = t => byId.has(t.subcategoryId) ? t.subcategoryId : (byId.has(t.categoryId) ? t.categoryId : null);
    const grouped = new Map(nodes.map(n => [n.id, []]));
    const orphan = [];
    for (const t of tools) {
      const leaf = leafOf(t);
      if (leaf) grouped.get(leaf).push(t);
      else {
        const byName = nodes.find(n => !n.parentId && String(n.name).toLowerCase() === String(t.category || '').toLowerCase());
        if (byName) grouped.get(byName.id).push(t); else orphan.push(t);
      }
    }
    const indexEntries = [];
    for (const n of nodes) {
      const list = grouped.get(n.id) || [];
      const path = categoryPath(n);
      const body = JSON.stringify({ version: VERSION, app: APP, format: 'category-collection', category: n, parentCategory: n.parentId ? (byId.get(n.parentId) || null) : null, recordCount: list.length, tools: list }, null, 2);
      files[path] = body;
      indexEntries.push({ id: n.id, displayId: n.displayId || '', name: n.name, parentId: n.parentId || null, path, recordCount: list.length, bytes: byteLength(body), sha256: await sha256(body), updatedAt: stamp });
    }
    if (orphan.length) { // never lose a record just because its category node is missing
      const path = 'database/categories/uncategorized-recovered.json';
      const body = JSON.stringify({ version: VERSION, app: APP, format: 'category-collection', category: { id: 'uncategorized-recovered', name: 'Uncategorized (recovered)', parentId: null }, recordCount: orphan.length, tools: orphan }, null, 2);
      files[path] = body;
      indexEntries.push({ id: 'uncategorized-recovered', name: 'Uncategorized (recovered)', parentId: null, path, recordCount: orphan.length, bytes: byteLength(body), sha256: await sha256(body), updatedAt: stamp });
    }
    files['database/category-index.json'] = JSON.stringify({ version: VERSION, app: APP, updatedAt: stamp, categories: indexEntries }, null, 2);
    files['database/collections.json'] = JSON.stringify({ version: VERSION, collections: collections || [], updatedAt: stamp }, null, 2);

    const pending = queue || [];
    files['staging/pending-tools.json'] = JSON.stringify({ version: VERSION, app: APP, updatedAt: stamp, pendingCount: pending.length, pending }, null, 2);

    const portableSettings = { ...(settings || {}) };
    for (const k of ['portableNativePath', 'portableNativeEnabled', 'portableFolderFallback']) delete portableSettings[k];
    let defaultCount = 0;
    if (defaultKeys) for (const t of tools) if (defaultKeys.has(urlKey(t.url))) defaultCount++;
    const profile = { version: VERSION, app: APP, exportedAt: stamp, localLibrary: tools, remoteLibrary: remote || [], settings: portableSettings, collections: collections || [], categories: nodes, toolCount: tools.length, categoryCount: nodes.length, defaultToolCount: defaultCount, personalToolCount: tools.length - defaultCount };
    files['database/legacy-local-library.json'] = JSON.stringify({ version: '5.0.0', app: APP, tools }, null, 2);
    if (createBackup) {
      const label = String(backupLabel || 'profile').replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'profile';
      const text = JSON.stringify(profile, null, 2);
      files[`backups/${label}-${stamp.replace(/[:.]/g, '-')}.json`] = text;
      files['backups/latest-backup.json'] = text;
    }
    // profile-data.json is written last so an interrupted sync never leaves it pointing at missing category files.
    files['profile-data.json'] = JSON.stringify(profile, null, 2);

    const manifestFiles = [];
    for (const [path, content] of Object.entries(files)) manifestFiles.push({ path, bytes: byteLength(content), sha256: await sha256(content) });
    const manifest = { version: VERSION, app: APP, format: 'personal-portable-database', updatedAt: stamp, toolCount: tools.length, categoryCount: nodes.length, defaultToolCount: defaultCount, personalToolCount: tools.length - defaultCount, collectionCount: (collections || []).length, stagingPending: pending.length, files: manifestFiles };
    files['database/database-manifest.json'] = JSON.stringify(manifest, null, 2);
    meta.counts = { tools: tools.length, categories: nodes.length, files: Object.keys(files).length };
    meta.order = Object.keys(files).filter(p => p !== 'profile-data.json' && p !== 'database/database-manifest.json').concat(['database/database-manifest.json', 'profile-data.json']);
    return { files, meta };
  }

  /* ---------- verified writing ---------- */
  async function verifyPaths(dest, files, paths) {
    const hashes = await dest.hashes(paths), mismatches = [];
    for (const p of paths) {
      const expected = await sha256(files[p]);
      if (hashes[p] === null || hashes[p] === undefined) mismatches.push({ path: p, reason: 'missing after write' });
      else if (hashes[p] !== expected) mismatches.push({ path: p, reason: 'content differs after write' });
    }
    return { checked: paths.length, mismatches };
  }

  async function removeStale(dest, files) {
    try {
      const oldText = await dest.read('database/category-index.json');
      const old = oldText ? parseJson(oldText) : null;
      const keep = new Set(Object.keys(files));
      for (const item of old?.categories || []) if (item.path && /^database\/(sub)?categories\//.test(item.path) && !keep.has(item.path)) await dest.remove(item.path);
    } catch (e) { await log(`Stale category file cleanup skipped: ${e.message}`, 'warn'); }
  }
  async function pruneBackups(dest) {
    try {
      const names = (await dest.list('backups')).filter(n => n !== 'latest-backup.json' && /\.json$/.test(n));
      const stampOf = n => n.replace(/\.json$/, '').slice(-24);
      names.sort((a, b) => stampOf(b).localeCompare(stampOf(a)));
      for (const n of names.slice(BACKUP_KEEP)) await dest.remove('backups/' + n);
    } catch {}
  }

  async function writeToDestination(entry, built, { full = false } = {}) {
    const { dest, key } = entry, files = built.files;
    const cache = writeCache.get(key) || new Map();
    const first = !writeCache.has(key);
    const result = { destination: dest.kind, label: dest.label, written: 0, skipped: 0, checked: 0, mismatches: [], conflict: null };
    // Safety: the first write of a session never silently shrinks an existing portable database.
    if (first) {
      try {
        const existing = parseJson(await dest.read('profile-data.json') || '');
        if (existing && Array.isArray(existing.localLibrary) && existing.localLibrary.length > built.meta.counts.tools) {
          const keys = new Set(JSON.parse(files['profile-data.json']).localLibrary.map(t => urlKey(t.url)));
          const missing = existing.localLibrary.filter(t => !keys.has(urlKey(t.url))).length;
          result.conflict = { folderTools: existing.localLibrary.length, localTools: built.meta.counts.tools, onlyInFolder: missing };
          await dest.write(`backups/pre-overwrite-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(existing, null, 2));
        }
      } catch (e) { await log(`Pre-write conflict check failed: ${e.message}`, 'warn'); }
    }
    const hashes = {};
    for (const p of built.meta.order) hashes[p] = await sha256(files[p]);
    const todo = built.meta.order.filter(p => full || cache.get(p) !== hashes[p]);
    for (const p of todo) { await dest.write(p, files[p]); result.written++; }
    result.skipped = built.meta.order.length - todo.length;
    await removeStale(dest, files);
    const toVerify = full ? built.meta.order : todo;
    let v = await verifyPaths(dest, files, toVerify);
    if (v.mismatches.length) { // one retry for the files that did not verify
      for (const m of v.mismatches) await dest.write(m.path, files[m.path]);
      v = await verifyPaths(dest, files, v.mismatches.map(m => m.path));
    }
    result.checked = toVerify.length; result.mismatches = v.mismatches;
    const failed = new Set(v.mismatches.map(m => m.path));
    const next = new Map(cache);
    for (const p of built.meta.order) if (!failed.has(p)) next.set(p, hashes[p]);
    for (const p of failed) next.delete(p);
    writeCache.set(key, next);
    if (todo.some(p => p.startsWith('backups/'))) await pruneBackups(dest);
    result.verified = v.mismatches.length === 0;
    return result;
  }

  async function sync({ tools = [], remote = [], settings = {}, categories = [], collections = [], manualBackup = false, backupLabel = '', queue, full = false, defaultKeys = null } = {}) {
    const dests = await activeDestinations(settings, { forWrite: true });
    if (!dests.nativeEnabled && !dests.handle) {
      await chrome.storage.local.set({ cmjPortableSync: { status: 'not-configured', lastSync: 0, fileCount: 0, error: '', verified: false } });
      return { ok: false, configured: false, verified: false, fileCount: 0 };
    }
    const saved = await chrome.storage.local.get('cmjPortableSync');
    const today = new Date().toISOString().slice(0, 10);
    const createBackup = manualBackup || (settings.portableKeepBackups !== false && saved.cmjPortableSync?.lastBackupDate !== today);
    const q = queue || await readQueue();
    const built = await buildFiles({ tools, remote, settings, categories, collections, queue: q, backupLabel: manualBackup ? backupLabel : '', createBackup, defaultKeys });
    const errors = [], methods = [], results = [];
    if (dests.native) {
      try {
        const r = await writeToDestination(dests.native, built, { full }); results.push(r);
        if (r.verified) methods.push('native'); else errors.push(`Native helper: ${r.mismatches.length} file(s) failed verification`);
        await log(`Native folder synchronized (${r.written} written, ${r.skipped} unchanged, ${r.checked} verified)`);
      } catch (e) {
        errors.push(`Native helper: ${e.message}`); await log(`Native helper error: ${e.message}`, 'error');
        if (!settings.portableFolderFallback && !dests.handle) { await chrome.storage.local.set({ cmjPortableSync: { status: 'native-error', lastSync: Date.now(), error: e.message, verified: false } }); throw e; }
      }
    }
    const folderAllowed = dests.folder && (!dests.nativeEnabled || methods.includes('native') || settings.portableFolderFallback !== false);
    if (folderAllowed) {
      try {
        const r = await writeToDestination(dests.folder, built, { full }); results.push(r);
        if (r.verified) methods.push('folder'); else errors.push(`Browser folder: ${r.mismatches.length} file(s) failed verification`);
        await log(`Extension user-data synchronized (${r.written} written, ${r.skipped} unchanged, ${r.checked} verified)`);
      } catch (e) { errors.push(`Browser folder: ${e.message}`); await log(`Portable folder error: ${e.message}`, 'error'); }
    } else if (dests.handle && !dests.folder && dests.folderError) errors.push(`Browser folder: ${dests.folderError}`);
    const conflict = results.find(r => r.conflict)?.conflict || null;
    const fileCount = Object.keys(built.files).length;
    if (methods.length) {
      const status = methods.length === 2 ? 'synced-both' : errors.length ? 'partial' : 'synced-' + methods[0];
      const error = errors.join(' | ');
      await chrome.storage.local.set({ cmjPortableSync: { status, lastSync: Date.now(), lastBackupDate: createBackup ? today : (saved.cmjPortableSync?.lastBackupDate || ''), fileCount, error, verified: true, verifiedAt: Date.now(), counts: built.meta.counts, conflict } });
      return { ok: errors.length === 0, partial: errors.length > 0, verified: true, method: methods.join('+'), fileCount, written: results.reduce((n, r) => n + r.written, 0), counts: built.meta.counts, conflict, error };
    }
    const error = errors.join(' | ') || 'No portable destination is available';
    await chrome.storage.local.set({ cmjPortableSync: { status: 'sync-error', lastSync: Date.now(), fileCount, error, verified: false } });
    throw new Error(error);
  }

  /* ---------- writing only the staging mirror (used immediately when a tool is queued) ---------- */
  async function writeStaging(queue, settings) {
    const cfg = settings ? { settings } : await chrome.storage.local.get('settings');
    const dests = await activeDestinations(cfg.settings || {}, { forWrite: true });
    const text = JSON.stringify({ version: VERSION, app: APP, updatedAt: new Date().toISOString(), pendingCount: queue.length, pending: queue }, null, 2);
    const want = await sha256(text);
    let wrote = 0;
    for (const entry of [dests.native, dests.folder].filter(Boolean)) {
      try {
        await entry.dest.write('staging/pending-tools.json', text);
        const h = (await entry.dest.hashes(['staging/pending-tools.json']))['staging/pending-tools.json'];
        if (h === want) wrote++;
        writeCache.get(entry.key)?.delete('staging/pending-tools.json');
      } catch (e) { await log(`Staging mirror not written: ${e.message}`, 'warn'); }
    }
    return { ok: wrote > 0, wrote };
  }

  /* ---------- reading / recovery ---------- */
  async function loadFromReader(read) {
    const problems = [];
    const profileText = await read('profile-data.json');
    let profile = profileText ? parseJson(profileText) : null;
    if (profileText && (!profile || !Array.isArray(profile.localLibrary))) { problems.push({ path: 'profile-data.json', reason: 'invalid JSON or missing localLibrary' }); profile = null; }
    const indexText = await read('database/category-index.json');
    const index = indexText ? parseJson(indexText) : null;
    const manifestText = await read('database/database-manifest.json');
    const manifest = manifestText ? parseJson(manifestText) : null;
    const catTools = [], catNodes = [];
    let categoryFilesFound = 0;
    if (index && Array.isArray(index.categories)) {
      for (const entry of index.categories) {
        const text = entry.path ? await read(entry.path) : null;
        if (text === null || text === undefined) { problems.push({ path: entry.path, reason: 'missing' }); continue; }
        const j = parseJson(text);
        if (!j || !Array.isArray(j.tools)) { problems.push({ path: entry.path, reason: 'corrupt JSON' }); continue; }
        if (entry.sha256 && await sha256(text) !== entry.sha256) problems.push({ path: entry.path, reason: 'modified since last sync (checksum differs)', warning: true });
        categoryFilesFound++;
        if (j.category) catNodes.push(j.category);
        for (const t of j.tools) catTools.push(t);
      }
    }
    const source = [];
    if (profile) source.push('profile');
    if (categoryFilesFound) source.push('categories');
    if (!profile && !categoryFilesFound) {
      const backupText = await read('backups/latest-backup.json');
      const backup = backupText ? parseJson(backupText) : null;
      if (backup && Array.isArray(backup.localLibrary)) { profile = backup; source.push('backup'); problems.push({ path: 'backups/latest-backup.json', reason: 'used as recovery source', warning: true }); }
    }
    const stagingText = await read('staging/pending-tools.json');
    const staging = stagingText ? parseJson(stagingText) : null;
    const stagingList = Array.isArray(staging?.pending) ? staging.pending : [];
    if (!profile && !categoryFilesFound) return { found: false, problems, staging: stagingList };
    // Merge both sources by URL; the most recently modified record wins and differing records count as conflicts.
    const merged = new Map(); let conflicts = 0;
    for (const t of [...(profile?.localLibrary || []), ...catTools]) {
      const k = urlKey(t.url); if (!k) continue;
      const old = merged.get(k);
      if (!old) { merged.set(k, t); continue; }
      if (JSON.stringify(old) !== JSON.stringify(t)) { conflicts++; if (Number(t.lastModified || 0) > Number(old.lastModified || 0)) merged.set(k, t); }
    }
    const nodeMap = new Map();
    const fromIndex = (index?.categories || []).map(({ id, displayId, name, parentId }) => ({ id, displayId, name, parentId, kind: parentId ? 'subcategory' : 'category' }));
    for (const n of [...(profile?.categories || []), ...catNodes, ...fromIndex]) if (n?.id && !nodeMap.has(n.id)) nodeMap.set(n.id, n);
    const collectionsText = await read('database/collections.json');
    const collections = profile?.collections || parseJson(collectionsText || '')?.collections || [];
    return {
      found: true,
      profile: { ...(profile || {}), version: profile?.version || VERSION, localLibrary: [...merged.values()], remoteLibrary: profile?.remoteLibrary || [], settings: profile?.settings || {}, collections, categories: [...nodeMap.values()] },
      staging: stagingList,
      info: { source: source.join('+'), problems, conflicts, profileTools: profile?.localLibrary?.length ?? null, categoryFileTools: categoryFilesFound ? catTools.length : null, manifestTools: manifest?.toolCount ?? null, categoryFiles: categoryFilesFound }
    };
  }

  async function readBundled() {
    const read = async p => { try { const r = await fetch(chrome.runtime.getURL('user-data/' + p), { cache: 'no-store' }); return r.ok ? await r.text() : null; } catch { return null; } };
    const out = await loadFromReader(read);
    if (out.found && out.profile.localLibrary.length === 0 && !out.staging.length) return { ...out, found: false };
    return out;
  }
  async function readDestination(options = {}) {
    const cfg = options.settings ? { settings: options.settings } : await chrome.storage.local.get('settings');
    const settings = cfg.settings || {};
    const nativePath = String(settings.portableNativePath || '').trim();
    let dest;
    if (options.method !== 'folder' && settings.portableNativeEnabled && nativePath) dest = nativeDestination(nativePath);
    else {
      const handle = await getHandle();
      if (!handle) return { found: false, problems: [], staging: [] };
      if (!await permission(handle, false)) throw new Error('Read permission for the portable folder was not granted.');
      dest = folderDestination(await getDataDirectory(handle, false), handle.name);
    }
    return loadFromReader(p => dest.read(p));
  }
  async function readProfile(options = {}) { const r = await readDestination(options); return r.found ? Object.assign(r.profile, { _info: r.info }) : null; }

  /* ---------- inspection / readiness ---------- */
  async function inspect(settingsOverride) {
    const cfg = settingsOverride ? { settings: settingsOverride } : await chrome.storage.local.get('settings');
    const dests = await activeDestinations(cfg.settings || {}, { forWrite: false });
    const entry = dests.native || dests.folder;
    if (!entry) return { ok: false, error: dests.folderError || 'No portable destination is connected' };
    const dest = entry.dest;
    const indexText = await dest.read('database/category-index.json');
    const index = indexText ? parseJson(indexText) : null;
    const manifest = parseJson(await dest.read('database/database-manifest.json') || '');
    const profile = parseJson(await dest.read('profile-data.json') || '');
    const staging = parseJson(await dest.read('staging/pending-tools.json') || '');
    const files = [], missing = [], corrupt = [], seen = new Set(), duplicates = [];
    let categoryFileTools = 0;
    for (const item of index?.categories || []) {
      const text = await dest.read(item.path);
      const row = { path: item.path, name: item.name, recordCount: item.recordCount, bytes: 0, status: 'ok' };
      if (text === null) { row.status = 'missing'; missing.push(item.path); }
      else {
        row.bytes = byteLength(text);
        const j = parseJson(text);
        if (!j || !Array.isArray(j.tools)) { row.status = 'corrupt'; corrupt.push(item.path); }
        else {
          row.recordCount = j.tools.length; categoryFileTools += j.tools.length;
          if (item.sha256 && await sha256(text) !== item.sha256) row.status = 'modified';
          for (const t of j.tools) { const k = urlKey(t.url); if (!k) continue; if (seen.has(k)) duplicates.push(k); seen.add(k); }
        }
      }
      files.push(row);
    }
    return {
      ok: true, destination: dest.label, kind: dest.kind, profilePresent: !!profile, profileTools: profile?.localLibrary?.length || 0,
      categoryFileTools, manifestTools: manifest?.toolCount ?? null, manifestCategories: manifest?.categoryCount ?? null, indexCategories: index?.categories?.length || 0,
      defaultToolCount: manifest?.defaultToolCount ?? null, personalToolCount: manifest?.personalToolCount ?? null,
      missingFiles: missing, corruptFiles: corrupt, duplicateUrls: duplicates, files, stagingPending: staging?.pendingCount ?? (staging?.pending?.length || 0)
    };
  }

  async function transferReadiness(args = {}) {
    const checks = [], add = (id, label, ok, detail) => checks.push({ id, label, ok: !!ok, detail: detail || '' });
    const tools = args.tools || [], cats = args.categories || [];
    const cfg = args.settings || (await chrome.storage.local.get('settings')).settings || {};
    const queue = args.queue || await readQueue();
    const counts = { tools: tools.length, categories: cats.length };
    add('queue', 'Staging queue is empty (nothing waiting to be migrated)', queue.length === 0, queue.length ? `${queue.length} record(s) still in the staging queue` : '');
    let res;
    try { res = await sync({ ...args, settings: cfg, queue, full: true, manualBackup: false }); }
    catch (e) { add('write', 'Full database write', false, e.message); return { ready: false, checks, counts }; }
    if (res.configured === false) { add('configured', 'A portable destination is connected', false, 'Select the extension folder or enable the Native helper first'); return { ready: false, checks, counts }; }
    add('configured', 'A portable destination is connected', true);
    add('write', 'Every file was written and verified by read-back', res.ok && res.verified, res.error || `${res.fileCount} files verified`);
    const r = await inspect(cfg);
    if (!r.ok) add('inspect', 'Database can be read back', false, r.error);
    else {
      add('profile', `profile-data.json holds all tools (${r.profileTools} / ${tools.length})`, r.profileTools === tools.length);
      add('categoryFiles', `Category files hold all tools (${r.categoryFileTools} / ${tools.length})`, r.categoryFileTools === tools.length);
      add('categories', `Category index lists every category (${r.indexCategories} / ${cats.length})`, r.indexCategories >= cats.length);
      add('files', 'No missing or corrupt category files', !r.missingFiles.length && !r.corruptFiles.length, [...r.missingFiles, ...r.corruptFiles].slice(0, 5).join(', '));
      add('duplicates', 'No duplicate URLs across category files', r.duplicateUrls.length === 0, r.duplicateUrls.length ? `${r.duplicateUrls.length} duplicate URL(s)` : '');
      add('manifest', 'Manifest totals match', r.manifestTools === tools.length, r.manifestTools === null ? 'manifest missing' : '');
    }
    return { ready: checks.every(c => c.ok), checks, counts: { ...counts, files: res.fileCount }, inspect: r };
  }

  /* ---------- GitHub database export: the repo's data/database directory is the primary database ---------- */
  const slug = n => String(n || 'category').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'category';
  async function buildGithubDatabase({ tools = [], categories = [] }) {
    const nodes = Array.isArray(categories) ? categories : [], byId = new Map(nodes.map(n => [n.id, n]));
    const clean = t => { const y = { ...t }; for (const k of ['favorite', 'notes', 'lastUsed', 'usageCount', 'source']) delete y[k]; if (y.favorite === undefined) y.favorite = false; y.notes = ''; y.usageCount = 0; y.lastUsed = 0; y.source = 'remote'; return y; };
    const leafOf = t => byId.has(t.subcategoryId) ? t.subcategoryId : (byId.has(t.categoryId) ? t.categoryId : null);
    const grouped = new Map(nodes.map(n => [n.id, []])), orphan = [];
    for (const t of tools) {
      const leaf = leafOf(t);
      if (leaf) grouped.get(leaf).push(clean(t));
      else { const byName = nodes.find(n => !n.parentId && String(n.name).toLowerCase() === String(t.category || '').toLowerCase()); (byName ? grouped.get(byName.id) : orphan).push(clean(t)); }
    }
    const used = new Set(), files = {}, entries = [], manifestFiles = [];
    const pathFor = n => {
      const parent = n.parentId ? byId.get(n.parentId) : null;
      let base = parent ? `subcategories/${slug(parent.name)}/${slug(n.name)}` : `categories/${slug(n.name)}`;
      if (used.has(base)) base += '-' + String(n.id).replace(/[^a-z0-9]/gi, '').slice(0, 6).toLowerCase();
      used.add(base); return base + '.json';
    };
    const emit = async (node, list) => {
      const rel = pathFor(node);
      list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      const body = JSON.stringify({ version: VERSION, app: APP, format: 'category-collection', category: node, parentCategory: node.parentId ? (byId.get(node.parentId) || null) : null, recordCount: list.length, tools: list }, null, 2);
      files['data/database/' + rel] = body;
      entries.push({ ...node, path: rel, recordCount: list.length });
      manifestFiles.push({ path: rel, recordCount: list.length, sha256: await sha256(body) });
      return list.length;
    };
    let total = 0;
    for (const n of nodes) total += await emit(n, grouped.get(n.id) || []);
    if (orphan.length) total += await emit({ id: 'uncategorized-recovered', name: 'Uncategorized (recovered)', parentId: null, kind: 'category' }, orphan);
    entries.sort((a, b) => String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase()));
    const stamp = new Date().toISOString();
    files['data/database/category-index.json'] = JSON.stringify({ version: VERSION, app: APP, categories: entries }, null, 2);
    files['data/database/database-manifest.json'] = JSON.stringify({ version: VERSION, app: APP, format: 'default-library-manifest', role: 'primary-database', exportedAt: stamp, categoryCount: entries.length, toolCount: total, categoryIndex: 'database/category-index.json', files: manifestFiles }, null, 2);
    files['data/database/database-config.json'] = JSON.stringify({ app: APP, version: VERSION, format: 'category-json-database', role: 'primary-database', runtimeDatabase: 'IndexedDB', stagingFile: 'data/default-tools.json (pointer only)' }, null, 2);
    files['data/default-tools.json'] = JSON.stringify({ version: VERSION, app: APP, format: 'default-library-pointer', tools: [], libraryManifest: 'database/database-manifest.json', categoryCount: entries.length, toolCount: total, note: 'The primary database is data/database/. This file is only a small pointer.' }, null, 2);
    files['README-GITHUB-UPDATE.txt'] = `Charlie MJ Tool Archive — GitHub database update (${stamp})\n\n${total} tools in ${entries.length} category files.\n\n1. In your repository delete the old folders  data/database/categories  and  data/database/subcategories  (and the old data/database/categories-index.json and backup-manifest.json if present).\n2. Copy the  data  folder from this ZIP over your repository's  data  folder.\n3. Commit and push. Other installations (and this one) pick it up with "Sync from GitHub Now".\n\nThe extension reads  data/database/database-manifest.json  and every category file it lists. data/default-tools.json is only a pointer.\n`;
    return { files, counts: { tools: total, categories: entries.length, files: Object.keys(files).length } };
  }
  async function githubDatabaseZip(args) {
    const built = await buildGithubDatabase(args);
    const blob = await window.CMJZip.create(Object.entries(built.files).map(([name, data]) => ({ name, data })));
    return { blob, counts: built.counts };
  }

  /* ---------- setup / status ---------- */
  async function chooseFolder() {
    if (!window.showDirectoryPicker) throw new Error('Folder access is not supported in this Chrome version. Use the Native Messaging helper.');
    const h = await window.showDirectoryPicker({ id: 'charliemj-extension-root', mode: 'readwrite' });
    if (!await permission(h)) throw new Error('Write permission was not granted.');
    try {
      const mf = await h.getFileHandle('manifest.json');
      const manifest = JSON.parse(await (await mf.getFile()).text());
      if (manifest.name !== 'Charlie MJ Tool Archive') throw new Error('The selected folder is not the Charlie MJ Tool Archive extension root.');
    } catch (e) {
      if (e?.name === 'NotFoundError') throw new Error('Select the exact unpacked Charlie MJ Tool Archive extension folder — the folder containing manifest.json, src, and data.');
      throw e;
    }
    const ud = await h.getDirectoryHandle('user-data', { create: true });
    for (const d of ['staging', 'database', 'backups']) await ud.getDirectoryHandle(d, { create: true });
    await storeHandle(h); writeCache.clear();
    return `${h.name}/user-data`;
  }
  async function log(message, level = 'info') {
    const r = await chrome.storage.local.get('cmjPortableLog'), list = r.cmjPortableLog || [];
    list.unshift({ at: Date.now(), level, message: String(message) });
    await chrome.storage.local.set({ cmjPortableLog: list.slice(0, 100) });
  }
  async function status() {
    const [handle, r, cfg] = await Promise.all([getHandle(), chrome.storage.local.get('cmjPortableSync'), chrome.storage.local.get('settings')]);
    let folder = 'Not selected';
    if (handle) folder = handle.name;
    else if (cfg.settings?.portableNativeEnabled && cfg.settings?.portableNativePath) folder = cfg.settings.portableNativePath;
    return { folder, configured: !!handle || !!(cfg.settings?.portableNativeEnabled && cfg.settings?.portableNativePath), sync: r.cmjPortableSync || { status: 'not-configured' }, nativeAvailable: !!chrome.runtime.connectNative };
  }
  async function forgetFolder() { await clearHandle(); writeCache.clear(); await chrome.storage.local.set({ cmjPortableSync: { status: 'not-configured', lastSync: 0, error: '', verified: false } }); }
  function clearWriteCache() { writeCache.clear(); }

  window.CMJPortable = { buildGithubDatabase, githubDatabaseZip, sync, chooseFolder, readProfile, readDestination, readBundled, status, forgetFolder, makeFiles: buildFiles, inspect, transferReadiness, writeStaging, clearWriteCache, log, sha256, urlKey, QUEUE_KEY };
})();
