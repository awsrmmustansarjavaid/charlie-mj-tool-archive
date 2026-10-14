/* Charlie MJ Tool Archive v6.2.0 — staging queue + migration engine.
 *
 * Every new or imported tool is first written to a durable staging queue (chrome.storage.local, mirrored to
 * user-data/staging/pending-tools.json). The queue is then validated, normalised, categorised, written to the
 * category database (IndexedDB collections + portable category JSON files), read back and verified.
 * A record leaves the queue ONLY after its destination write has been verified.
 */
(() => {
  'use strict';
  const KEY = 'cmjStagingQueueV1', STATS = 'cmjStagingStatsV1', LOG = 'cmjStagingLogV1';
  const MAX_ATTEMPTS = 3, BACKUP_GAP_MS = 10 * 60 * 1000;
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  let chain = Promise.resolve();
  const serial = fn => { const run = chain.then(fn, fn); chain = run.catch(() => {}); return run; };

  const getQueue = async () => { const r = await chrome.storage.local.get(KEY); return Array.isArray(r[KEY]) ? r[KEY] : []; };
  const setQueue = q => chrome.storage.local.set({ [KEY]: q });
  async function mutate(fn) { const q = await getQueue(); const next = fn(q) || q; await setQueue(next); return next; }
  async function getStats() {
    const r = await chrome.storage.local.get(STATS);
    return { migrated: 0, duplicate: 0, failed: 0, lastRun: 0, lastBackupAt: 0, ...(r[STATS] || {}) };
  }
  async function addLog(rows) {
    if (!rows.length) return;
    const r = await chrome.storage.local.get(LOG), list = Array.isArray(r[LOG]) ? r[LOG] : [];
    await chrome.storage.local.set({ [LOG]: [...rows.map(x => ({ at: Date.now(), ...x })), ...list].slice(0, 150) });
  }
  const mirror = async queue => { try { await window.CMJPortable?.writeStaging(queue); } catch {} };

  /* Durable first step: the queue is saved before anything else happens. */
  async function enqueue(items, source = 'manual') {
    const entries = (items || []).filter(Boolean).map(tool => ({ queueId: uid(), source, enqueuedAt: Date.now(), status: 'pending', attempts: 0, error: '', tool: { ...tool } }));
    if (!entries.length) return [];
    const q = await mutate(list => [...list, ...entries]);
    await mirror(q);
    return entries;
  }

  async function mergeExternal(entries) { // queue entries found in a copied user-data folder
    if (!Array.isArray(entries) || !entries.length) return 0;
    let added = 0;
    await mutate(list => {
      const have = new Set(list.map(e => e.queueId));
      for (const e of entries) if (e?.queueId && e.tool && !have.has(e.queueId)) { list.push({ ...e, status: e.status === 'failed' ? 'failed' : 'pending' }); added++; }
      return list;
    });
    return added;
  }

  async function counts() {
    const q = await getQueue(), s = await getStats();
    return {
      queue: q.length, pending: q.filter(e => e.status === 'pending').length,
      verifying: q.filter(e => e.status === 'migrated').length, failed: q.filter(e => e.status === 'failed').length,
      totals: { migrated: s.migrated, duplicate: s.duplicate, failed: s.failed }, lastRun: s.lastRun
    };
  }

  /* ctx: { getLocal, prepare, exactUrl, ensureCategories, apply, save, portableConfigured, backup } */
  function process(ctx) {
    return serial(async () => {
      const summary = { migrated: 0, duplicates: 0, failed: 0, awaiting: 0, verifiedIds: 0 };
      let queue = await getQueue();
      if (!queue.length) return summary;
      const stats = await getStats(), logRows = [];
      const keyOf = u => ctx.exactUrl(u);
      const localKeys = () => new Set(ctx.getLocal().map(t => keyOf(t.url)));

      // a) Recover entries interrupted mid-migration: if the tool is present, continue to verification, else retry.
      const present = localKeys();
      for (const e of queue) if (e.status === 'migrated') { if (!present.has(keyOf(e.tool.url))) { e.status = 'pending'; e.error = ''; } }

      // b) Validate / normalise / de-duplicate / categorise the pending records.
      const pending = queue.filter(e => e.status === 'pending');
      const accepted = [], seen = localKeys();
      if (pending.length) {
        const gap = Date.now() - (stats.lastBackupAt || 0);
        if (ctx.backup && (pending.length >= 20 || gap > BACKUP_GAP_MS)) { try { await ctx.backup(); stats.lastBackupAt = Date.now(); } catch {} }
        for (const e of pending) {
          try {
            const tool = ctx.prepare(e.tool);
            if (!tool || !/^https?:\/\//i.test(tool.url || '')) throw new Error('A valid http(s) URL is required');
            if (!String(tool.name || '').trim()) throw new Error('A name is required');
            const k = keyOf(tool.url);
            if (seen.has(k)) { e.status = 'duplicate'; summary.duplicates++; logRows.push({ outcome: 'duplicate', name: tool.name, url: tool.url, source: e.source }); continue; }
            await ctx.ensureCategories(tool);
            seen.add(k); e.tool = tool; e.toolId = tool.id; e.status = 'migrated'; e.error = ''; accepted.push(tool);
          } catch (err) {
            e.attempts = (e.attempts || 0) + 1; e.error = String(err.message || err);
            if (e.attempts >= MAX_ATTEMPTS || /valid http|required/.test(e.error)) { e.status = 'failed'; summary.failed++; logRows.push({ outcome: 'failed', name: e.tool?.name || '', url: e.tool?.url || '', source: e.source, error: e.error }); }
          }
        }
        if (accepted.length) ctx.apply(accepted);
        await setQueue(queue); // status changes are durable before the heavy write starts
      }

      // c) Write + verify everything that is waiting for verification.
      const waiting = queue.filter(e => e.status === 'migrated');
      if (waiting.length) {
        let portable = null, saveError = '';
        try { portable = await ctx.save(); } catch (err) { saveError = String(err.message || err); }
        let idbIds = null;
        try { if (window.CMJDatabase) { const db = await window.CMJDatabase.readAll(); idbIds = new Set(db.records.flatMap(c => (c.tools || []).map(t => t.id))); } } catch {}
        const portableOn = ctx.portableConfigured ? await ctx.portableConfigured() : false;
        for (const e of waiting) {
          const inIdb = idbIds ? idbIds.has(e.toolId) : !saveError;
          const portableOk = !portableOn || !!(portable && portable.verified);
          if (inIdb && portableOk && !saveError) { e.status = 'done'; summary.migrated++; logRows.push({ outcome: 'migrated', name: e.tool.name, url: e.tool.url, source: e.source }); }
          else {
            e.error = saveError || (!inIdb ? 'Database read-back did not find the record' : (portable?.error || 'Portable folder write is not verified yet'));
            summary.awaiting++;
            e.attempts = (e.attempts || 0) + 1;
            if (!inIdb && e.attempts >= MAX_ATTEMPTS) { e.status = 'failed'; summary.failed++; logRows.push({ outcome: 'failed', name: e.tool.name, url: e.tool.url, source: e.source, error: e.error }); }
          }
        }
      }

      // d) Remove only records that are verified (or duplicates); keep failed + not-yet-verified ones.
      const finished = queue.filter(e => e.status === 'done' || e.status === 'duplicate');
      stats.migrated += summary.migrated; stats.duplicate += summary.duplicates; stats.failed += summary.failed; stats.lastRun = Date.now();
      const mine = new Map(queue.map(e => [e.queueId, e]));
      queue = (await getQueue()).filter(cur => { const m = mine.get(cur.queueId); return !(m && (m.status === 'done' || m.status === 'duplicate')); })
        .map(cur => mine.get(cur.queueId) || cur);
      await setQueue(queue);
      await chrome.storage.local.set({ [STATS]: stats });
      await addLog(logRows);
      if (finished.length || summary.failed) await mirror(queue);
      return summary;
    });
  }

  async function retryFailed() { await mutate(q => { for (const e of q) if (e.status === 'failed') { e.status = 'pending'; e.attempts = 0; e.error = ''; } return q; }); }
  async function discardFailed() { const q = await mutate(list => list.filter(e => e.status !== 'failed')); await mirror(q); }
  async function recentLog(n = 30) { const r = await chrome.storage.local.get(LOG); return (r[LOG] || []).slice(0, n); }

  /* Compare Chrome Storage, IndexedDB, in-memory library and the portable JSON files; repair by rewriting from memory. */
  function reconcile(ctx) {
    return serial(async () => {
      const report = { details: [], repaired: false };
      const mem = ctx.getLocal().length;
      const chromeStore = (await chrome.storage.local.get('localLibrary')).localLibrary?.length ?? 0;
      let idb = null; try { idb = (await window.CMJDatabase.stats()).tools; } catch {}
      let portable = null;
      const portableOn = ctx.portableConfigured ? await ctx.portableConfigured() : false;
      if (portableOn) { try { const r = await window.CMJPortable.inspect(ctx.settings?.()); if (r.ok) portable = { profile: r.profileTools, categoryFiles: r.categoryFileTools, missing: r.missingFiles.length, corrupt: r.corruptFiles.length }; } catch (e) { report.details.push('Portable read failed: ' + e.message); } }
      const bad = [];
      if (chromeStore !== mem) bad.push(`Chrome Storage has ${chromeStore}, memory has ${mem}`);
      if (idb !== null && idb !== mem) bad.push(`IndexedDB has ${idb}, memory has ${mem}`);
      if (portable && (portable.profile !== mem || portable.categoryFiles !== mem || portable.missing || portable.corrupt)) bad.push(`Portable files: profile ${portable.profile}, category files ${portable.categoryFiles}, missing ${portable.missing}, corrupt ${portable.corrupt} (expected ${mem})`);
      if (bad.length) {
        report.details.push(...bad);
        try { await ctx.save({ full: true }); report.repaired = true; report.details.push('Rewrote all stores from the in-memory library and verified them.'); } catch (e) { report.details.push('Repair failed: ' + e.message); }
      }
      report.counts = { memory: mem, chromeStorage: chromeStore, indexedDB: idb, portable };
      report.consistent = bad.length === 0 || report.repaired;
      return report;
    });
  }

  window.CMJStaging = { KEY, enqueue, mergeExternal, process, reconcile, counts, retryFailed, discardFailed, recentLog, getQueue };
})();
