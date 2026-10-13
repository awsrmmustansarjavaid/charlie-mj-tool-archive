/* IndexedDB persistence layer. Each category/subcategory is a separate logical collection.
 * JSON files are portable collection exports; Chrome extensions cannot silently write
 * arbitrary files into their installed directory, so exports are user-initiated downloads.
 */
(() => {
  'use strict';
  const DB_NAME = 'CharlieMJToolArchiveDB';
  const DB_VERSION = 1;
  const STORES = { categories: 'categories', collections: 'collections', records: 'categoryCollections', meta: 'meta' };
  let opening;
  function open() {
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORES.categories)) db.createObjectStore(STORES.categories, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.collections)) db.createObjectStore(STORES.collections, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.records)) {
          const s = db.createObjectStore(STORES.records, { keyPath: 'categoryId' });
          s.createIndex('displayId', 'displayId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta, { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { opening = null; reject(req.error || new Error('Could not open IndexedDB')); };
      req.onblocked = () => reject(new Error('Database upgrade is blocked by another open extension tab'));
    });
    return opening;
  }
  const request = req => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  async function readAll() {
    const db = await open(), tx = db.transaction(Object.values(STORES), 'readonly');
    const [categories, collections, records, marker] = await Promise.all([
      request(tx.objectStore(STORES.categories).getAll()), request(tx.objectStore(STORES.collections).getAll()),
      request(tx.objectStore(STORES.records).getAll()), request(tx.objectStore(STORES.meta).get('initialized'))
    ]);
    return { initialized: Boolean(marker?.value), categories, collections, records };
  }
  async function replaceAll(categories, grouped, collections = []) {
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(Object.values(STORES), 'readwrite');
      const cs = tx.objectStore(STORES.categories), rs = tx.objectStore(STORES.records), xs = tx.objectStore(STORES.collections), ms = tx.objectStore(STORES.meta);
      cs.clear(); rs.clear(); xs.clear();
      for (const c of categories || []) cs.put(c);
      for (const category of (categories || [])) {
        const categoryId = category.id, tools = (grouped || {})[categoryId] || [];
        rs.put({ categoryId, displayId: category.displayId || categoryId, name: category.name || 'Uncategorized', parentId: category.parentId || null, tools: Array.isArray(tools) ? tools : [], updatedAt: Date.now() });
      }
      for (const c of collections || []) xs.put(c);
      ms.put({ key: 'initialized', value: true, updatedAt: Date.now(), schemaVersion: 1 });
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Database transaction aborted'));
    });
    return readAll();
  }
  async function replaceCategory(category, tools) {
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.categories, STORES.records], 'readwrite');
      tx.objectStore(STORES.categories).put(category);
      tx.objectStore(STORES.records).put({ categoryId: category.id, displayId: category.displayId, name: category.name, parentId: category.parentId || null, tools: Array.isArray(tools) ? tools : [], updatedAt: Date.now() });
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Category update aborted'));
    });
  }
  async function removeCategories(ids) {
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.categories, STORES.records], 'readwrite');
      for (const id of ids || []) { tx.objectStore(STORES.categories).delete(id); tx.objectStore(STORES.records).delete(id); }
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Category removal aborted'));
    });
  }
  async function replaceCollections(collections = []) {
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.collections], 'readwrite'), store = tx.objectStore(STORES.collections);
      store.clear(); for (const c of collections) store.put(c);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Collections update aborted'));
    });
  }
  async function stats() {
    const data = await readAll();
    const total = data.records.reduce((n, c) => n + (c.tools?.length || 0), 0);
    return { categories: data.categories.length, collections: data.records.length, tools: total, initialized: data.initialized };
  }
  window.CMJDatabase = { open, readAll, replaceAll, replaceCategory, replaceCollections, removeCategories, stats, DB_NAME };
})();
