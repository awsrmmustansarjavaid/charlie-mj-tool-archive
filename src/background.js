const GITHUB_SYNC_ALARM = 'charlie-mj-github-sync';
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/awsrmmustansarjavaid/charlie-mj-tool-archive/main/data/default-tools.json';
const DEFAULT_INTERVAL = 15;

const makeId = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
function normalizeUrl(url) {
  try {
    const u = new URL(String(url || '').trim());
    u.search = '';
    u.hash = '';
    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    u.pathname = u.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch { return String(url || '').trim().toLowerCase().replace(/\/$/, ''); }
}
function unique(a) { return [...new Set((a || []).filter(Boolean))]; }
function normalizeTool(raw, source='local') {
  return {
    id: raw.id || makeId(), name: String(raw.name || 'Untitled').trim(), url: String(raw.url || '').trim(),
    category: String(raw.category || 'Uncategorized').trim() || 'Uncategorized', type: String(raw.type || 'Website').trim() || 'Website',
    tags: Array.isArray(raw.tags) ? unique(raw.tags.map(String).map(x=>x.trim())) : [], description: String(raw.description || '').trim(),
    notes: String(raw.notes || '').trim(), favorite: Boolean(raw.favorite), usageCount: Number(raw.usageCount || 0),
    lastUsed: Number(raw.lastUsed || 0), addedAt: Number(raw.addedAt || Date.now()), lastModified: Number(raw.lastModified || raw.addedAt || Date.now()),
    source
  };
}
function payloadTools(payload) { return Array.isArray(payload) ? payload : payload?.tools; }
async function fetchJson(url) {
  const r = await fetch(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`, {cache:'no-store'});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function bundled() { return payloadTools(await fetchJson(chrome.runtime.getURL('data/default-tools.json'))) || []; }
async function remote() { return payloadTools(await fetchJson(GITHUB_RAW_URL)) || []; }
function fingerprint(x) { return JSON.stringify({name:x.name,url:normalizeUrl(x.url),category:x.category,type:x.type,tags:unique(x.tags),description:x.description}); }
function mapByUrl(list) { const m=new Map(); for(const raw of list||[]){const x=normalizeTool(raw); const k=normalizeUrl(x.url); if(k && !m.has(k)) m.set(k,x);} return m; }
function mergeUnique(list) { const m=new Map(), out=[]; for(const raw of list||[]){const x=normalizeTool(raw,'local'); const k=normalizeUrl(x.url); if(!k) continue; if(!m.has(k)){m.set(k,x);out.push(x)} else {const old=m.get(k); old.tags=unique([...old.tags,...x.tags]); if(!old.description&&x.description)old.description=x.description; if(!old.notes&&x.notes)old.notes=x.notes; old.favorite ||= x.favorite; old.usageCount=Math.max(old.usageCount||0,x.usageCount||0); old.lastUsed=Math.max(old.lastUsed||0,x.lastUsed||0);} } return out; }

async function migrate() {
  const r = await chrome.storage.local.get(['localLibrary','remoteLibrary','tools','settings','migrationVersion']);
  if (Array.isArray(r.localLibrary) && Array.isArray(r.remoteLibrary)) return r;
  const localDefault = await bundled();
  const remoteDefault = Array.isArray(r.remoteLibrary) ? r.remoteLibrary : [];
  const old = Array.isArray(r.tools) ? r.tools : [];
  const localMap = mapByUrl(localDefault), remoteMap = mapByUrl(remoteDefault);
  const local = mergeUnique(localDefault);
  const lm = mapByUrl(local);
  // Preserve v4 personal tools, but do not misclassify old GitHub-only records as local.
  for (const raw of old) {
    const x=normalizeTool(raw,'local'), k=normalizeUrl(x.url); if(!k) continue;
    if(remoteMap.has(k) && !localMap.has(k)) continue;
    const existing=lm.get(k);
    if(existing){ existing.favorite ||= x.favorite; existing.notes ||= x.notes; existing.usageCount=Math.max(existing.usageCount||0,x.usageCount||0); existing.lastUsed=Math.max(existing.lastUsed||0,x.lastUsed||0); if(x.description && !existing.description) existing.description=x.description; }
    else { local.push(x); lm.set(k,x); }
  }
  await chrome.storage.local.set({localLibrary:local, remoteLibrary:remoteDefault.map(x=>normalizeTool(x,'remote')), settings:r.settings||{theme:'system',density:'comfortable',syncEnabled:true,syncInterval:15}, migrationVersion:2});
  return {localLibrary:local,remoteLibrary:remoteDefault};
}

async function syncGithub({manual=false}={}) {
  try {
    const r=await migrate();
    const old=Array.isArray(r.remoteLibrary)?r.remoteLibrary:[];
    const incoming=(await remote()).map(x=>normalizeTool(x,'remote'));
    const oldMap=mapByUrl(old), newMap=mapByUrl(incoming);
    let added=0, updated=0;
    for(const [k,x] of newMap){ if(!oldMap.has(k)) added++; else if(fingerprint(oldMap.get(k))!==fingerprint(x)) updated++; }
    const removed=[...oldMap.keys()].filter(k=>!newMap.has(k)).length;
    const changes={added,updated,removed,items:{added:[],updated:[],removed:[]}};
    for(const [k,x] of newMap){if(!oldMap.has(k))changes.items.added.push(x.name); else if(fingerprint(oldMap.get(k))!==fingerprint(x))changes.items.updated.push(x.name)}
    for(const k of oldMap.keys())if(!newMap.has(k))changes.items.removed.push(oldMap.get(k).name);
    const history = (r.syncHistory||[]).slice(0,9);
    history.unshift({at:Date.now(),status:'success',added,updated,removed,remoteCount:incoming.length});
    await chrome.storage.local.set({remoteLibrary:incoming,syncState:{lastSync:Date.now(),lastStatus:'success',lastError:'',source:GITHUB_RAW_URL,remoteCount:incoming.length,added,updated,removed},syncChanges:changes,syncHistory:history});
    await chrome.alarms.create(GITHUB_SYNC_ALARM,{periodInMinutes:Math.max(15, Number((r.settings||{}).syncInterval||DEFAULT_INTERVAL))});
    return {ok:true,added,updated,removed,remoteCount:incoming.length,changes};
  } catch(e) {
    const r=await chrome.storage.local.get(['syncHistory']);
    const history=(r.syncHistory||[]).slice(0,9); history.unshift({at:Date.now(),status:'error',error:String(e.message||e)});
    await chrome.storage.local.set({syncState:{lastSync:Date.now(),lastStatus:'error',lastError:String(e.message||e),source:GITHUB_RAW_URL},syncHistory:history});
    return {ok:false,error:String(e.message||e)};
  }
}
async function setup(){
  await migrate();
  const r=await chrome.storage.local.get('settings');
  if(r.settings?.syncEnabled !== false) await syncGithub();
  try { await chrome.alarms.create(GITHUB_SYNC_ALARM,{periodInMinutes:Math.max(15,Number(r.settings?.syncInterval||DEFAULT_INTERVAL))}); } catch {}
  try { await chrome.contextMenus.removeAll(); chrome.contextMenus.create({id:'save-to-charlie-mj',title:'Save to Charlie MJ Tool Archive',contexts:['page','link']}); } catch {}
}
chrome.runtime.onInstalled.addListener(setup); chrome.runtime.onStartup.addListener(setup);
chrome.alarms.onAlarm.addListener(a=>{if(a.name===GITHUB_SYNC_ALARM)chrome.storage.local.get('settings').then(s=>{if(s.settings?.syncEnabled!==false)syncGithub()})});
chrome.runtime.onMessage.addListener((m,_s,send)=>{
  if(m?.type==='sync-github'){syncGithub({manual:true}).then(send);return true;}
  if(m?.type==='get-library-state'){chrome.storage.local.get(['localLibrary','remoteLibrary','syncState','syncHistory','syncChanges','settings']).then(send);return true;}
  if(m?.type==='set-sync-settings'){chrome.storage.local.get('settings').then(async r=>{const settings={...(r.settings||{}),...(m.settings||{})};await chrome.storage.local.set({settings});if(settings.syncEnabled!==false)await chrome.alarms.create(GITHUB_SYNC_ALARM,{periodInMinutes:Math.max(15,Number(settings.syncInterval||DEFAULT_INTERVAL))});send({ok:true,settings})});return true;}
});
chrome.contextMenus.onClicked.addListener(async(info,tab)=>{
  const url=info.linkUrl||info.pageUrl||tab?.url||''; if(!/^https?:\/\//i.test(url))return;
  const r=await migrate(); const local=Array.isArray(r.localLibrary)?r.localLibrary:[]; const k=normalizeUrl(url);
  if(!local.some(x=>normalizeUrl(x.url)===k)) local.push(normalizeTool({name:info.linkText||tab?.title||new URL(url).hostname,url,category:'Saved from Chrome',type:'Website'},'local'));
  await chrome.storage.local.set({localLibrary:mergeUnique(local)}); chrome.tabs.create({url:chrome.runtime.getURL('src/dashboard.html')});
});
chrome.commands.onCommand.addListener(c=>{if(c==='open-dashboard')chrome.tabs.create({url:chrome.runtime.getURL('src/dashboard.html')})});
chrome.action.onClicked.addListener(()=>chrome.tabs.create({url:chrome.runtime.getURL('src/dashboard.html')}));
