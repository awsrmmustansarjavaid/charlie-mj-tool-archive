const DEFAULT_SEED_VERSION = 6;
const GITHUB_SYNC_ALARM = 'charlie-mj-github-sync';
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/awsrmmustansarjavaid/charlie-mj-tool-archive/main/data/default-tools.json';

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function normalizeUrl(url) {
  try {
    const u = new URL(String(url || '').trim());
    // For an archive, query-string variants of the same saved page count as one website.
    u.search = '';
    u.hash = '';
    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    u.pathname = u.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return String(url || '').trim().toLowerCase().replace(/\/$/, '');
  }
}

function normalizeTool(raw, source = 'local') {
  return {
    id: raw.id || makeId(),
    name: String(raw.name || 'Untitled').trim(),
    url: String(raw.url || '').trim(),
    category: String(raw.category || 'Uncategorized').trim() || 'Uncategorized',
    type: String(raw.type || 'Website').trim() || 'Website',
    tags: Array.isArray(raw.tags) ? [...new Set(raw.tags.map(String).map(x => x.trim()).filter(Boolean))] : [],
    description: String(raw.description || '').trim(),
    notes: String(raw.notes || '').trim(),
    favorite: Boolean(raw.favorite),
    lastUsed: Number(raw.lastUsed || 0),
    addedAt: Number(raw.addedAt || Date.now()),
    lastModified: Number(raw.lastModified || raw.addedAt || Date.now()),
    source: raw.source || source,
    githubFingerprint: raw.githubFingerprint || '',
    githubSyncedAt: Number(raw.githubSyncedAt || 0)
  };
}

async function loadBundledTools() {
  const response = await fetch(chrome.runtime.getURL('data/default-tools.json'), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Default library HTTP ${response.status}`);
  return response.json();
}

async function loadGithubTools() {
  const url = `${GITHUB_RAW_URL}?t=${Date.now()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`GitHub library HTTP ${response.status}`);
  return response.json();
}

function mergeRemoteTools(existing, incoming, source) {
  const byUrl = new Map();
  const tools = [];
  for (const raw of existing) {
    const item = normalizeTool(raw, 'local');
    const key = normalizeUrl(item.url);
    if (!key) continue;
    if (byUrl.has(key)) {
      const keep = byUrl.get(key);
      keep.tags = [...new Set([...(keep.tags || []), ...(item.tags || [])])];
      if (!keep.description && item.description) keep.description = item.description;
      if (!keep.category || keep.category === 'Uncategorized') keep.category = item.category;
      continue;
    }
    byUrl.set(key, item); tools.push(item);
  }

  let added = 0, enriched = 0;
  for (const raw of incoming || []) {
    const item = normalizeTool(raw, source);
    const key = normalizeUrl(item.url);
    if (!key) continue;
    const old = byUrl.get(key);
    if (!old) {
      item.favorite = false;
      item.notes = '';
      item.lastUsed = 0;
      item.addedAt = item.addedAt || Date.now();
      item.source = source;
      item.githubSyncedAt = Date.now();
      tools.push(item); byUrl.set(key, item); added++; continue;
    }

    // Remote data can fill blanks, but never destroys local personal data.
    const before = JSON.stringify([old.name, old.category, old.type, old.description, old.tags]);
    if (!old.name || old.name === 'Untitled') old.name = item.name;
    if (!old.category || old.category === 'Uncategorized' || old.category === 'Imported') old.category = item.category;
    if (!old.type || old.type === 'Website') old.type = item.type || old.type;
    if (!old.description && item.description) old.description = item.description;
    old.tags = [...new Set([...(old.tags || []), ...(item.tags || [])])];
    old.githubFingerprint = JSON.stringify({ name: item.name, url: item.url, category: item.category, type: item.type, tags: item.tags, description: item.description });
    old.githubSyncedAt = Date.now();
    if (JSON.stringify([old.name, old.category, old.type, old.description, old.tags]) !== before) enriched++;
  }
  return { tools, added, enriched };
}

async function syncGithub({manual = false} = {}) {
  try {
    const current = await chrome.storage.local.get(['tools', 'settings', 'syncState']);
    const incomingPayload = await loadGithubTools();
    const incoming = Array.isArray(incomingPayload) ? incomingPayload : incomingPayload.tools;
    if (!Array.isArray(incoming)) throw new Error('GitHub default-tools.json has no tools array');
    const result = mergeRemoteTools(Array.isArray(current.tools) ? current.tools : [], incoming, 'github');
    const syncState = {
      ...current.syncState,
      lastSync: Date.now(),
      lastStatus: 'success',
      lastError: '',
      source: GITHUB_RAW_URL,
      added: result.added,
      enriched: result.enriched,
      remoteCount: incoming.length
    };
    await chrome.storage.local.set({ tools: result.tools, syncState, defaultSeedVersion: DEFAULT_SEED_VERSION });
    return { ok: true, ...result, remoteCount: incoming.length, syncState };
  } catch (error) {
    const syncState = { lastSync: Date.now(), lastStatus: 'error', lastError: String(error.message || error), source: GITHUB_RAW_URL };
    await chrome.storage.local.set({ syncState });
    if (manual) console.error('Charlie MJ GitHub sync failed:', error);
    return { ok: false, error: syncState.lastError, syncState };
  }
}

async function seedOrMigrate() {
  const current = await chrome.storage.local.get(['tools', 'settings', 'defaultSeedVersion']);
  const defaults = await loadBundledTools();
  const incoming = Array.isArray(defaults) ? defaults : defaults.tools;
  const result = mergeRemoteTools(Array.isArray(current.tools) ? current.tools : [], incoming, 'bundled');
  await chrome.storage.local.set({
    tools: result.tools,
    defaultSeedVersion: DEFAULT_SEED_VERSION,
    settings: current.settings || { theme: 'system', density: 'comfortable' }
  });
}

async function setup() {
  try { await seedOrMigrate(); } catch (error) { console.error('Charlie MJ migration failed:', error); }
  try { await syncGithub(); } catch (error) { console.error('Charlie MJ GitHub sync failed:', error); }
  try {
    await chrome.alarms.create(GITHUB_SYNC_ALARM, { periodInMinutes: 15 });
  } catch (error) { console.error('GitHub sync alarm failed:', error); }
  try {
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({ id: 'save-to-charlie-mj', title: 'Save to Charlie MJ Tool Archive', contexts: ['page', 'link'] });
  } catch (error) { console.error('Context menu setup failed:', error); }
}

chrome.runtime.onInstalled.addListener(setup);
chrome.runtime.onStartup.addListener(setup);
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === GITHUB_SYNC_ALARM) syncGithub(); });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'sync-github') {
    syncGithub({ manual: true }).then(sendResponse);
    return true;
  }
  if (message?.type === 'get-sync-state') {
    chrome.storage.local.get('syncState').then(r => sendResponse(r.syncState || {}));
    return true;
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  if (!/^https?:\/\//i.test(url)) return;
  const current = await chrome.storage.local.get('tools');
  const tools = Array.isArray(current.tools) ? current.tools : [];
  const key = normalizeUrl(url);
  if (!tools.some(tool => normalizeUrl(tool.url) === key)) {
    tools.push(normalizeTool({
      name: info.linkText || tab?.title || new URL(url).hostname,
      url, category: 'Saved from Chrome', type: 'Website', tags: [], description: '', notes: ''
    }, 'local'));
    await chrome.storage.local.set({ tools });
  }
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard.html') });
});

chrome.commands.onCommand.addListener(command => {
  if (command === 'open-dashboard') chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard.html') });
});
chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard.html') }));
