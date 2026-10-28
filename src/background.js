try { importScripts('search-core.js'); } catch (e) { console.warn('search-core unavailable', e); }
const GITHUB_SYNC_ALARM = 'charlie-mj-github-sync';
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/awsrmmustansarjavaid/charlie-mj-tool-archive/main/data/default-tools.json';
const GITHUB_DATA_BASE = GITHUB_RAW_URL.replace(/default-tools\.json$/, '');
const DEFAULT_INTERVAL = 15;
const STAGING_KEY = 'cmjStagingQueueV1';

const makeId = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
function normalizeUrl(url) {
  try {
    const u = new URL(String(url || '').trim());
    u.hash = '';
    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    if ((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80')) u.port = '';
    u.pathname = u.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    return u.toString().replace(/\/$/, '');
  } catch { return String(url || '').trim().replace(/\/$/, ''); }
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
// v6.2.0: the data/database/ directory (category JSON files listed by a manifest) is the PRIMARY library, both for the
// packaged defaults and for the GitHub remote library. data/default-tools.json is only a pointer / compatibility file;
// a flat default-tools.json that still contains a tools array is used only as a fallback.
async function loadCategoryDirectory(dbBase) {
  let manifest = null, paths = null, expected = null, manifestName = '';
  try { manifest = await fetchJson(dbBase + 'database-manifest.json'); if (Array.isArray(manifest.files) && manifest.files.length) { paths = manifest.files.map(f => f.path); expected = manifest.toolCount; manifestName = 'database-manifest.json'; } } catch {}
  if (!paths) { try { const m = await fetchJson(dbBase + 'backup-manifest.json'); if (Array.isArray(m.collectionFiles) && m.collectionFiles.length) { paths = m.collectionFiles; expected = m.toolCount; manifestName = 'backup-manifest.json'; } } catch {} }
  if (!paths) throw new Error('No database manifest found in data/database/');
  const tools = [];
  for (let i = 0; i < paths.length; i += 10) {
    const parts = await Promise.all(paths.slice(i, i + 10).map(p => fetchJson(dbBase + p)));
    for (const part of parts) tools.push(...(payloadTools(part) || []));
  }
  if (Number.isFinite(expected) && tools.length !== expected) throw new Error(`Database directory incomplete: ${tools.length} of ${expected} tools loaded`);
  return { tools, info: { source: 'database-directory', manifest: manifestName, categoryFiles: paths.length, tools: tools.length } };
}
async function loadLibrary(dataBase, flatUrl) {
  try { return await loadCategoryDirectory(dataBase + 'database/'); }
  catch (dirErr) {
    try { const flat = payloadTools(await fetchJson(flatUrl)); if (Array.isArray(flat) && flat.length) return { tools: flat, info: { source: 'default-tools.json', categoryFiles: 0, tools: flat.length, note: 'data/database unavailable (' + dirErr.message + ') — used default-tools.json' } }; } catch {}
    throw dirErr;
  }
}
async function bundledWithInfo() { const base = chrome.runtime.getURL('data/'); return loadLibrary(base, base + 'default-tools.json'); }
async function remoteWithInfo() { return loadLibrary(GITHUB_DATA_BASE, GITHUB_RAW_URL); }
async function bundled() { return (await bundledWithInfo()).tools; }
async function remote() { return (await remoteWithInfo()).tools; }
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
    const loaded=await remoteWithInfo();const incoming=loaded.tools.map(x=>normalizeTool(x,'remote'));
    const oldMap=mapByUrl(old), newMap=mapByUrl(incoming);
    let added=0, updated=0;
    for(const [k,x] of newMap){ if(!oldMap.has(k)) added++; else if(fingerprint(oldMap.get(k))!==fingerprint(x)) updated++; }
    const removed=[...oldMap.keys()].filter(k=>!newMap.has(k)).length;
    const changes={added,updated,removed,items:{added:[],updated:[],removed:[]}};
    for(const [k,x] of newMap){if(!oldMap.has(k))changes.items.added.push(x.name); else if(fingerprint(oldMap.get(k))!==fingerprint(x))changes.items.updated.push(x.name)}
    for(const k of oldMap.keys())if(!newMap.has(k))changes.items.removed.push(oldMap.get(k).name);
    const history = (r.syncHistory||[]).slice(0,9);
    history.unshift({at:Date.now(),status:'success',added,updated,removed,remoteCount:incoming.length});
    await chrome.storage.local.set({remoteLibrary:incoming,syncState:{lastSync:Date.now(),lastStatus:'success',lastError:'',source:GITHUB_DATA_BASE+'database/',remoteCount:incoming.length,added,updated,removed,remoteInfo:loaded.info},syncChanges:changes,syncHistory:history});
    await chrome.alarms.create(GITHUB_SYNC_ALARM,{periodInMinutes:Math.max(15, Number((r.settings||{}).syncInterval||DEFAULT_INTERVAL))});
    return {ok:true,added,updated,removed,remoteCount:incoming.length,changes,info:loaded.info};
  } catch(e) {
    const r=await chrome.storage.local.get(['syncHistory']);
    const history=(r.syncHistory||[]).slice(0,9); history.unshift({at:Date.now(),status:'error',error:String(e.message||e)});
    await chrome.storage.local.set({syncState:{lastSync:Date.now(),lastStatus:'error',lastError:String(e.message||e),source:GITHUB_RAW_URL},syncHistory:history});
    return {ok:false,error:String(e.message||e)};
  }
}
// Context menu creation is serialized and idempotent. onInstalled and onStartup can
// both fire (and setup() awaits network sync), which used to create the same menu id
// twice -> "Cannot create item with duplicate id save-to-charlie-mj".
const MENU_ID='save-to-charlie-mj';
let menuChain=Promise.resolve();
function ensureContextMenu(){
  menuChain=menuChain.then(()=>new Promise(resolve=>{
    try{
      chrome.contextMenus.removeAll(()=>{
        void chrome.runtime.lastError;
        chrome.contextMenus.create({id:MENU_ID,title:'Save to Charlie MJ Tool Archive',contexts:['page','link']},()=>{void chrome.runtime.lastError;resolve()});
      });
    }catch(e){resolve()}
  }));
  return menuChain;
}
let setupRunning=null;
function setup(){
  if(setupRunning)return setupRunning;
  setupRunning=(async()=>{
    await ensureContextMenu();
    try{
      await migrate();
      const r=await chrome.storage.local.get('settings');
      if(r.settings?.syncEnabled !== false) await syncGithub();
      try { await chrome.alarms.create(GITHUB_SYNC_ALARM,{periodInMinutes:Math.max(15,Number(r.settings?.syncInterval||DEFAULT_INTERVAL))}); } catch {}
    }catch(e){console.warn('setup error',e)}
  })().finally(()=>{setupRunning=null});
  return setupRunning;
}
chrome.runtime.onInstalled.addListener(setup); chrome.runtime.onStartup.addListener(setup);
chrome.alarms.onAlarm.addListener(a=>{if(a.name===GITHUB_SYNC_ALARM)chrome.storage.local.get('settings').then(s=>{if(s.settings?.syncEnabled!==false)syncGithub()})});
chrome.runtime.onMessage.addListener((m,_s,send)=>{
  if(m?.type==='get-default-library'){bundled().then(tools=>send({ok:true,tools})).catch(e=>send({ok:false,error:String(e.message||e)}));return true;}
  if(m?.type==='check-github'){remoteWithInfo().then(r=>send({ok:true,info:r.info})).catch(e=>send({ok:false,error:String(e.message||e)}));return true;}
  if(m?.type==='sync-github'){syncGithub({manual:true}).then(send);return true;}
  if(m?.type==='get-library-state'){chrome.storage.local.get(['localLibrary','remoteLibrary','syncState','syncHistory','syncChanges','settings']).then(send);return true;}
  if(m?.type==='set-sync-settings'){chrome.storage.local.get('settings').then(async r=>{const settings={...(r.settings||{}),...(m.settings||{})};await chrome.storage.local.set({settings});if(settings.syncEnabled!==false)await chrome.alarms.create(GITHUB_SYNC_ALARM,{periodInMinutes:Math.max(15,Number(settings.syncInterval||DEFAULT_INTERVAL))});send({ok:true,settings})});return true;}
});
chrome.contextMenus.onClicked.addListener(async(info,tab)=>{
  const url=info.linkUrl||info.pageUrl||tab?.url||''; if(!/^https?:\/\//i.test(url))return;
  await migrate();
  // v6.2.0: new tools go through the durable staging queue; the dashboard validates, categorises and verifies them.
  const r=await chrome.storage.local.get(STAGING_KEY); const queue=Array.isArray(r[STAGING_KEY])?r[STAGING_KEY]:[];
  queue.push({queueId:makeId(),source:'context-menu',enqueuedAt:Date.now(),status:'pending',attempts:0,error:'',tool:normalizeTool({name:info.linkText||tab?.title||new URL(url).hostname,url,category:'Saved from Chrome',type:'Website'},'local')});
  await chrome.storage.local.set({[STAGING_KEY]:queue}); chrome.tabs.create({url:chrome.runtime.getURL('src/dashboard.html')});
});
chrome.commands.onCommand.addListener(c=>{if(c==='open-dashboard')chrome.tabs.create({url:chrome.runtime.getURL('src/dashboard.html')})});
chrome.action.onClicked.addListener(()=>chrome.tabs.create({url:chrome.runtime.getURL('src/dashboard.html')}));


// v6.2.1 Chrome address-bar search. Type "cmj", press Space/Tab, then start typing:
// categories and tools are suggested live with the matching text highlighted.
let omniCache={at:0,tools:[]};
async function omniTools(){
  if(Date.now()-omniCache.at<4000&&omniCache.tools.length)return omniCache.tools;
  const r=await chrome.storage.local.get(['localLibrary','remoteLibrary','settings']);
  let all=[...(r.localLibrary||[]),...(r.remoteLibrary||[])];
  if(!all.length){try{all=await bundled()}catch{}}
  omniCache={at:Date.now(),tools:all,settings:r.settings||{}};
  return all;
}
function omniEnabled(){const s=omniCache.settings||{};return !(s.moduleFlags?.omnibox===false||s.omnibox?.enabled===false)}
const dashUrl=(qs)=>chrome.runtime.getURL('src/dashboard.html')+(qs?'?'+qs:'');
if (chrome.omnibox) {
  try{chrome.omnibox.setDefaultSuggestion({description:'Search Charlie MJ Tool Archive for <match>%s</match> <dim>— tools &amp; categories</dim>'})}catch{}
  chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
    try {
      const q=String(text||'').trim();
      const tools=await omniTools();
      if(!omniEnabled()||!q){suggest([]);return;}
      const X=CMJSearch.escXml, M=(t)=>CMJSearch.markup(t,q,'<match>','</match>',X);
      const out=[];
      CMJSearch.searchCategories(tools,q,3).forEach(c=>out.push({
        content:'cat:'+c.name,
        description:'<dim>Category</dim> '+M(c.name)+' <dim>— '+c.count+' tool'+(c.count===1?'':'s')+'</dim>'
      }));
      const used=new Set(out.map(o=>o.content));
      CMJSearch.searchTools(tools,q,8).forEach(({tool})=>{
        const content=String(tool.url||'');
        if(!content||used.has(content))return; used.add(content);
        out.push({content,description:M(tool.name||'Tool')+' <dim>— '+M(tool.category||'Uncategorized')+'</dim> <url>'+X(CMJSearch.hostOf(tool.url)||tool.url)+'</url>'});
      });
      suggest(out.slice(0,9));
    } catch { suggest([]); }
  });
  chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
    const query=String(text||'').trim();
    const open=(url)=>{
      if(disposition==='currentTab')chrome.tabs.update({url});
      else chrome.tabs.create({url,active:disposition!=='newBackgroundTab'});
    };
    if(/^https?:\/\//i.test(query)){open(query);return;}
    if(/^cat:/i.test(query)){open(dashUrl('category='+encodeURIComponent(query.slice(4))));return;}
    try{
      const tools=await omniTools();
      if(omniEnabled()){
        const top=CMJSearch.searchTools(tools,query,1)[0];
        if(top&&top.tool.url&&top.score>=60){open(top.tool.url);return;}
      }
    }catch{}
    open(dashUrl('q='+encodeURIComponent(query)));
  });
}

chrome.storage.onChanged.addListener((c,a)=>{if(a==='local'&&(c.localLibrary||c.remoteLibrary||c.settings))omniCache.at=0});
