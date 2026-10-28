/* Charlie MJ Tool Archive — shared smart-search core (v6.2.1)
 * Used by the dashboard search bar (<script>) and the Chrome address-bar
 * "cmj" keyword search (importScripts in the service worker).
 * Features: multi-word AND search, prefix / word-start / substring ranking,
 * typo tolerance, category + tool suggestions and match highlighting.
 */
(function (root) {
  'use strict';

  const cache = new WeakMap();
  const lc = (v) => String(v == null ? '' : v).toLowerCase();

  function hostOf(url) {
    try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { return ''; }
  }

  function fields(tool) {
    let f = cache.get(tool);
    if (f && f.stamp === tool.lastModified) return f;
    const labels = [].concat(tool.tags || [], tool.smartLabels || [], tool.aliases || []).map(lc).join(' ');
    f = {
      stamp: tool.lastModified,
      name: lc(tool.name),
      host: hostOf(tool.url),
      url: lc(tool.url),
      labels,
      category: lc(tool.category),
      sub: lc(tool.subcategory),
      desc: lc(tool.description) + ' ' + lc(tool.notes)
    };
    f.nameWords = f.name.split(/[^a-z0-9À-￿]+/).filter(Boolean);
    f.labelWords = labels.split(/[^a-z0-9À-￿]+/).filter(Boolean);
    f.catWords = (f.category + ' ' + f.sub).split(/[^a-z0-9À-￿]+/).filter(Boolean);
    cache.set(tool, f);
    return f;
  }

  function wordStart(words, t) { return words.some((w) => w.startsWith(t)); }

  // Edit distance <= 1 between the term and the same-length start of a word.
  function nearPrefix(words, t) {
    if (t.length < 5) return false;
    return words.some((w) => {
      const a = w.slice(0, t.length), b = t;
      if (a === b) return true;
      if (Math.abs(a.length - b.length) > 1) return false;
      let i = 0;
      while (i < a.length && i < b.length && a[i] === b[i]) i++;
      return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i);
    });
  }

  function subsequence(text, t) {
    if (t.length < 4) return false;
    let i = 0;
    for (let k = 0; k < text.length && i < t.length; k++) if (text[k] === t[i]) i++;
    return i === t.length;
  }

  function termScore(f, t) {
    if (f.name === t) return 100;
    if (f.name.startsWith(t)) return 92;
    if (wordStart(f.nameWords, t)) return 82;
    if (f.name.includes(t)) return 68;
    if (f.host.startsWith(t)) return 72;
    if (wordStart(f.labelWords, t)) return 62;
    if (f.host.includes(t)) return 56;
    if (wordStart(f.catWords, t)) return 55;
    if (f.labels.includes(t)) return 46;
    if (f.category.includes(t) || f.sub.includes(t)) return 42;
    if (f.url.includes(t)) return 30;
    if (f.desc.includes(t)) return 22;
    if (nearPrefix(f.nameWords, t) || nearPrefix(f.labelWords, t) || nearPrefix(f.catWords, t)) return 26;
    if (subsequence(f.name, t)) return 18;
    return 0;
  }

  function terms(q) {
    return lc(q).replace(/\b(?:category|subcategory|tag|favorite|type|used):/g, ' ')
      .replace(/["']/g, ' ').split(/\s+/).filter(Boolean);
  }

  /** Relevance score of one tool for a query (0 = no match). */
  function score(tool, q) {
    const ts = terms(q);
    if (!ts.length) return 0;
    const f = fields(tool);
    let total = 0;
    for (const t of ts) {
      const s = termScore(f, t);
      if (!s) return 0;
      total += s;
    }
    const phrase = ts.join(' ');
    if (ts.length > 1 && f.name.includes(phrase)) total += 40;
    return total / ts.length + (tool.favorite ? 3 : 0) + Math.min(5, (tool.usageCount || 0) / 4);
  }

  /** Ranked tool matches, de-duplicated by URL. */
  function searchTools(tools, q, limit) {
    const seen = new Set();
    const out = [];
    for (const tool of tools || []) {
      const s = score(tool, q);
      if (s > 0) out.push({ tool, score: s });
    }
    out.sort((a, b) => b.score - a.score || lc(a.tool.name).localeCompare(lc(b.tool.name)));
    const res = [];
    for (const o of out) {
      const key = lc(o.tool.url).replace(/\/$/, '') || o.tool.id;
      if (seen.has(key)) continue;
      seen.add(key);
      res.push(o);
      if (limit && res.length >= limit) break;
    }
    return res;
  }

  /** Matching categories with tool counts, best first. */
  function searchCategories(tools, q, limit, extraNames) {
    const ts = terms(q);
    if (!ts.length) return [];
    const counts = new Map();
    for (const t of tools || []) {
      const c = String(t.category || 'Uncategorized');
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    (extraNames || []).forEach((n) => { if (n && !counts.has(n)) counts.set(n, 0); });
    const res = [];
    counts.forEach((count, name) => {
      const n = lc(name), words = n.split(/[^a-z0-9À-￿]+/).filter(Boolean);
      let total = 0;
      for (const t of ts) {
        let s = 0;
        if (n === t) s = 100;
        else if (n.startsWith(t)) s = 90;
        else if (wordStart(words, t)) s = 78;
        else if (n.includes(t)) s = 60;
        else if (nearPrefix(words, t)) s = 30;
        else if (subsequence(n, t)) s = 15;
        if (!s) { total = 0; break; }
        total += s;
      }
      if (total > 0) res.push({ name, count, score: total / ts.length });
    });
    res.sort((a, b) => b.score - a.score || b.count - a.count || a.name.localeCompare(b.name));
    return limit ? res.slice(0, limit) : res;
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const escXml = escHtml;

  /** Wrap matched query terms in open/close markers; all text is escaped. */
  function markup(text, q, open, close, esc) {
    text = String(text == null ? '' : text);
    esc = esc || escHtml;
    const ts = terms(q).sort((a, b) => b.length - a.length);
    if (!ts.length || !text) return esc(text);
    const low = text.toLowerCase();
    if (low.length !== text.length) return esc(text); // exotic casing; skip highlighting
    const marks = new Array(text.length).fill(false);
    for (const t of ts) {
      let i = low.indexOf(t);
      while (i !== -1) {
        for (let k = i; k < i + t.length; k++) marks[k] = true;
        i = low.indexOf(t, i + t.length);
      }
    }
    let out = '', inMark = false, buf = '';
    for (let k = 0; k < text.length; k++) {
      if (marks[k] !== inMark) {
        out += (inMark ? open + esc(buf) + close : esc(buf));
        buf = ''; inMark = marks[k];
      }
      buf += text[k];
    }
    out += (inMark ? open + esc(buf) + close : esc(buf));
    return out;
  }

  const highlightHtml = (text, q) => markup(text, q, '<mark>', '</mark>', escHtml);

  root.CMJSearch = { score, searchTools, searchCategories, terms, hostOf, escHtml, escXml, markup, highlightHtml };
})(typeof self !== 'undefined' ? self : this);
