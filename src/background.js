const DEFAULT_SEED_VERSION = 5;

async function loadDefaultTools() {
  const response = await fetch(chrome.runtime.getURL('data/default-tools.json'));
  if (!response.ok) throw new Error(`Default library HTTP ${response.status}`);
  return response.json();
}

function normalizeUrl(url) {
  try {
    const u = new URL(String(url || '').trim());
    u.hash = '';
    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return String(url || '').trim().toLowerCase().replace(/\/$/, '');
  }
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function seedOrMigrate() {
  const current = await chrome.storage.local.get(['tools', 'settings', 'defaultSeedVersion']);
  const defaults = await loadDefaultTools();
  const existing = Array.isArray(current.tools) ? current.tools : [];
  const byUrl = new Map(existing.map(tool => [normalizeUrl(tool.url), tool]));
  let tools = [...existing];

  for (const raw of defaults) {
    const item = {
      id: raw.id || makeId(),
      name: raw.name || 'Untitled',
      url: raw.url || '',
      category: raw.category || 'Imported',
      type: raw.type || 'Website',
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      description: raw.description || '',
      notes: raw.notes || '',
      favorite: false,
      lastUsed: 0
    };
    const key = normalizeUrl(item.url);
    if (!key) continue;
    if (!byUrl.has(key)) {
      tools.push(item);
      byUrl.set(key, item);
    }
  }

  // Repair IDs on older versions without changing user data.
  const ids = new Set();
  tools = tools.map(tool => {
    let id = tool.id;
    if (!id || ids.has(id)) id = makeId();
    ids.add(id);
    return { ...tool, id, tags: Array.isArray(tool.tags) ? tool.tags : [] };
  });

  await chrome.storage.local.set({
    tools,
    defaultSeedVersion: DEFAULT_SEED_VERSION,
    settings: current.settings || { theme: 'system', density: 'comfortable', sidebar: true }
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await seedOrMigrate();
  } catch (error) {
    console.error('Charlie MJ default library migration failed:', error);
  }

  try {
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
      id: 'save-to-charlie-mj',
      title: 'Save to Charlie MJ Tool Archive',
      contexts: ['page', 'link']
    });
  } catch (error) {
    console.error('Context menu setup failed:', error);
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  if (!/^https?:\/\//i.test(url)) return;

  const current = await chrome.storage.local.get('tools');
  const tools = Array.isArray(current.tools) ? current.tools : [];
  const normalize = normalizeUrl(url);
  const exists = tools.some(tool => normalizeUrl(tool.url) === normalize);

  if (!exists) {
    tools.push({
      id: makeId(),
      name: info.linkText || tab?.title || new URL(url).hostname,
      url,
      category: 'Saved from Chrome',
      type: 'Website',
      tags: [],
      description: '',
      notes: '',
      favorite: false,
      lastUsed: 0
    });
    await chrome.storage.local.set({ tools });
  }

  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard.html') });
});

chrome.commands.onCommand.addListener(command => {
  if (command === 'open-dashboard') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard.html') });
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard.html') });
});
