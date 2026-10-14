/* Charlie MJ Tool Archive v6.1.1 — additive advanced services.
 * Keeps the v5 localLibrary/remoteLibrary contract intact. New metadata is optional.
 */
(() => {
  'use strict';
  const KEY = {
    categories: 'cmjCategoriesV6',
    collections: 'cmjCollectionsV6',
    revisions: 'cmjToolRevisionsV6',
    settings: 'cmjAdvancedSettingsV6',
    migration: 'cmjAdvancedMigrationV6'
  };
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : `cmj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const slug = s => String(s || 'uncategorized').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48) || 'UNCATEGORIZED';
  const displayId = (name,id,parent=null) => `${parent?parent.displayId+'-':''}${slug(name)}-${String(id||uuid()).replace(/-/g,'').slice(-6).toUpperCase()}`;
  const get = keys => chrome.storage.local.get(keys);
  const set = data => chrome.storage.local.set(data);
  const exactUrl = value => {
    try {
      const u = new URL(String(value).trim());
      u.hash = '';
      u.hostname = u.hostname.toLowerCase().replace(/^www\./,'');
      if ((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80')) u.port = '';
      u.pathname = u.pathname.replace(/\/{2,}/g,'/').replace(/\/$/,'') || '/';
      // Query parameters and path case are meaningful and intentionally retained.
      return u.toString().replace(/\/$/,'');
    } catch { return String(value || '').trim(); }
  };
  const tokenize = value => String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(x=>x.length>1);
  function levenshtein(a,b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      const cur=[i];
      for(let j=1;j<=b.length;j++) cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      prev=cur;
    }
    return prev[b.length];
  }
  function similarity(a,b) {
    a=String(a||'').toLowerCase(); b=String(b||'').toLowerCase();
    if(a===b) return 100;
    if(!a||!b) return 0;
    return Math.round((1-levenshtein(a,b)/Math.max(a.length,b.length))*100);
  }
  function urlSimilarity(a,b) {
    let ua,ub; try{ua=new URL(a);ub=new URL(b)}catch{return similarity(a,b)}
    const A=exactUrl(a),B=exactUrl(b);
    if(A===B)return 100;
    const hostA=ua.hostname.toLowerCase().replace(/^www\./,''),hostB=ub.hostname.toLowerCase().replace(/^www\./,'');
    const pathA=ua.pathname.replace(/\/$/,'')||'/',pathB=ub.pathname.replace(/\/$/,'')||'/';
    const queryA=[...ua.searchParams.entries()].sort().map(x=>x.join('=')).join('&');
    const queryB=[...ub.searchParams.entries()].sort().map(x=>x.join('=')).join('&');
    const host=similarity(hostA,hostB),path=similarity(pathA,pathB),query=similarity(queryA,queryB);
    const sameHost=hostA===hostB;
    // Weighted structural score. Same host alone never means duplicate.
    return Math.round((host*.25 + path*.65 + query*.10) * (sameHost?1:1));
  }
  function suggestLabels(tool) {
    const words=tokenize([tool.name,tool.category,tool.description,(tool.tags||[]).join(' ')].join(' '));
    const stop=new Set(['with','from','your','this','that','tool','tools','online','free','best','the','and','for','you']);
    return [...new Set(words.filter(w=>w.length>2&&!stop.has(w)))].slice(0,18);
  }
  function searchScore(tool,q) {
    const query=String(q||'').trim().toLowerCase(); if(!query)return 0;
    const name=(tool.name||'').toLowerCase(),url=(tool.url||'').toLowerCase(),host=(()=>{try{return new URL(tool.url).hostname.toLowerCase()}catch{return ''}})();
    const labels=[...(tool.smartLabels||[]),...(tool.aliases||[]),...(tool.tags||[])].join(' ').toLowerCase();
    const category=(tool.category||'').toLowerCase(),sub=(tool.subcategory||'').toLowerCase(),desc=(tool.description||'').toLowerCase();
    if(name===query)return 1000;
    if(name.startsWith(query))return 900;
    if(host===query||host.startsWith(query))return 850;
    if(url===query)return 825;
    if(labels.split(/\s+/).includes(query))return 800;
    if(category===query||sub===query)return 750;
    if(labels.includes(query))return 700;
    if(name.includes(query))return 650;
    if(host.includes(query)||url.includes(query))return 600;
    if(category.includes(query)||sub.includes(query))return 550;
    if(desc.includes(query))return 300;
    const terms=tokenize(query);
    if(!terms.length)return 0;
    const hay=tokenize([name,host,url,labels,category,sub,desc].join(' '));
    const matches=terms.filter(t=>hay.some(w=>w===t||w.startsWith(t))).length;
    return matches===terms.length?200+matches:matches?matches*30:0;
  }
  async function ensureInitialized(tools=[]) {
    const r=await get([KEY.categories,KEY.migration]);
    if(r[KEY.migration]) return r[KEY.categories]||[];
    const names=[...new Set((tools||[]).map(x=>String(x.category||'Uncategorized').trim()||'Uncategorized'))];
    let seedNodes=[];
    try { const url=chrome.runtime?.getURL?chrome.runtime.getURL('data/database/category-index.json'):'../data/database/category-index.json'; const response=await fetch(url); if(response.ok){const seed=await response.json();seedNodes=Array.isArray(seed.categories)?seed.categories:[]} } catch {}
    const categories=names.map(name=>{const seed=seedNodes.find(x=>String(x.name).toLowerCase()===name.toLowerCase());const id=seed?.id||uuid();return{id,displayId:seed?.displayId||displayId(name,id),name,parentId:null,kind:'category',createdAt:Date.now(),updatedAt:Date.now()}});
    await set({[KEY.categories]:categories,[KEY.migration]:true});
    return categories;
  }
  async function categories(){if(window.CMJDatabase){try{const db=await window.CMJDatabase.readAll();if(db.initialized)return db.categories||[]}catch{}}const r=await get(KEY.categories);return r[KEY.categories]||[]}
  function reconcileToolPaths(list,tools){
    const byId=new Map(list.map(n=>[n.id,n]));
    for(const t of tools){
      const target=byId.get(t.subcategoryId)||byId.get(t.categoryId);
      if(!target)continue;
      const chain=[];let cur=target;while(cur){chain.unshift(cur);cur=cur.parentId?byId.get(cur.parentId):null}
      const root=chain[0];t.category=root.name;t.categoryId=root.id;
      const path=chain.slice(1).map(n=>n.name);
      if(path.length){t.subcategory=path.join(' / ');t.subcategoryId=target.id;}else{delete t.subcategory;delete t.subcategoryId;}
      t.displayId=`${target.displayId}-${slug(t.name)}-${String(t.id||uuid()).slice(-6).toUpperCase()}`;
    }
    return tools;
  }
  async function ensureCategory(name,parentId=null) {
    name=String(name||'').trim(); if(!name)throw new Error('Category name is required');
    const list=await categories(),parent=list.find(x=>x.id===parentId)||null;
    const found=list.find(x=>x.name.toLowerCase()===name.toLowerCase()&&x.parentId===(parent?.id||null));
    if(found)return found;
    const id=uuid(),node={id,displayId:displayId(name,id,parent),name,parentId:parent?.id||null,kind:parent?'subcategory':'category',createdAt:Date.now(),updatedAt:Date.now()};
    list.push(node);
    const idx=await get('cmjCategoryDatabaseIndexV6'),index=idx.cmjCategoryDatabaseIndexV6||[];
    await set({[KEY.categories]:list,cmjCategoryDatabaseIndexV6:[...index,{id:node.id,displayId:node.displayId,name:node.name,parentId:node.parentId,recordCount:0}]});
    if(window.CMJDatabase) await window.CMJDatabase.replaceCategory(node, []);
    return node;
  }
  async function renameCategory(id,name) {
    name=String(name||'').trim();if(!name)throw new Error('Name is required');
    const list=await categories(),node=list.find(x=>x.id===id);if(!node)throw new Error('Category not found');
    node.name=name;node.updatedAt=Date.now();
    const byId=new Map(list.map(x=>[x.id,x]));
    const rebuild=n=>{const parent=n.parentId?byId.get(n.parentId):null;n.displayId=displayId(n.name,n.id,parent);list.filter(c=>c.parentId===n.id).forEach(rebuild)};
    rebuild(node);
    const r=await get('localLibrary'),tools=r.localLibrary||[];
    reconcileToolPaths(list,tools);
    await set({[KEY.categories]:list,localLibrary:tools});await syncTools(tools,list);return node;
  }
  async function deleteCategory(id,mode='move') {
    const list=await categories(),node=list.find(x=>x.id===id);if(!node) return;
    const descendants=new Set([id]);let changed=true;
    while(changed){changed=false;for(const n of list)if(n.parentId&&descendants.has(n.parentId)&&!descendants.has(n.id)){descendants.add(n.id);changed=true}}
    const r=await get('localLibrary'),tools=r.localLibrary||[];
    const affected=tools.filter(t=>descendants.has(t.categoryId)||descendants.has(t.subcategoryId));
    if(mode==='delete') { const ids=new Set(affected.map(t=>t.id)); await set({localLibrary:tools.filter(t=>!ids.has(t.id))}); }
    else { for(const t of affected){t.category='Uncategorized';delete t.categoryId;delete t.subcategoryId;delete t.subcategory; } await set({localLibrary:tools}); }
    const remaining=list.filter(n=>!descendants.has(n.id));await set({[KEY.categories]:remaining,localLibrary:tools});await syncTools(tools,remaining);
    return {removed:descendants.size,affected:affected.length};
  }
  async function enrichTool(raw,allCategories) {
    const t={...raw};
    const catName=String(t.category||'Uncategorized').trim()||'Uncategorized';
    const cat=allCategories.find(c=>c.name.toLowerCase()===catName.toLowerCase()&&c.parentId===null) || await ensureCategory(catName);
    t.categoryId=t.categoryId||cat.id;
    if(t.subcategory){const sub=await ensureCategory(t.subcategory,cat.id);t.subcategoryId=t.subcategoryId||sub.id;}
    t.smartLabels=Array.isArray(t.smartLabels)?t.smartLabels:suggestLabels(t);
    t.aliases=Array.isArray(t.aliases)?t.aliases:[];
    t.displayId=t.displayId||`${cat.displayId}-${slug(t.name)}-${String(t.id||uuid()).slice(-6).toUpperCase()}`;
    return t;
  }
  async function syncTools(tools,categoryOverride=null) {
    let cats=categoryOverride||await categories();
    for(const t of tools){const name=String(t.category||'Uncategorized').trim()||'Uncategorized';if(!cats.some(c=>c.name.toLowerCase()===name.toLowerCase()&&c.parentId===null)){const id=uuid();cats.push({id,displayId:displayId(name,id),name,parentId:null,kind:'category',createdAt:Date.now(),updatedAt:Date.now()})}}
    await set({[KEY.categories]:cats});
    const grouped={};
    for(const t of tools){
      const cat=cats.find(c=>c.name.toLowerCase()===String(t.category||'Uncategorized').toLowerCase()&&c.parentId===null);
      t.categoryId=cat?.id||t.categoryId;
      let leaf=cat;
      if(t.subcategory){
        const parts=String(t.subcategory).split(/[/>]/).map(x=>x.trim()).filter(Boolean);
        for(const part of parts){
          let sub=cats.find(c=>c.name.toLowerCase()===part.toLowerCase()&&c.parentId===leaf?.id);
          if(!sub){(()=>{const id=uuid();sub={id,displayId:displayId(part,id,leaf),name:part,parentId:leaf?.id||null,kind:'subcategory',createdAt:Date.now(),updatedAt:Date.now()};cats.push(sub)})()}
          leaf=sub;
        }
        t.subcategory=parts.join(' / ');t.subcategoryId=leaf?.id;
      } else { delete t.subcategoryId; }
      t.smartLabels=Array.isArray(t.smartLabels)?t.smartLabels:suggestLabels(t);
      t.aliases=Array.isArray(t.aliases)?t.aliases:[];
      t.displayId=t.displayId||`${leaf?.displayId||cat?.displayId||slug(t.category)}-${slug(t.name)}-${String(t.id||uuid()).slice(-6).toUpperCase()}`;
      // A record belongs to exactly one leaf collection. Parent category files remain independent.
      const key=leaf?.id||cat?.id||'uncategorized';(grouped[key]??=[]).push(t);
    }
    const prior=await get('cmjCategoryDatabaseIndexV6');
    const previous=prior.cmjCategoryDatabaseIndexV6||[];
    const updates={[KEY.categories]:cats};
    const index=[];
    for(const c of cats){
      const records=grouped[c.id]||[];
      index.push({id:c.id,displayId:c.displayId,name:c.name,parentId:c.parentId,recordCount:records.length});
    }
    updates.cmjCategoryDatabaseIndexV6=index;
    await set(updates);
    if(window.CMJDatabase) await window.CMJDatabase.replaceAll(cats,grouped,await collections());
    const obsolete=[...previous.map(x=>x.storageKey).filter(Boolean),'cmjCategoryCollectionsV6'];
    if(obsolete.length&&chrome.storage.local.remove)await chrome.storage.local.remove(obsolete);
    return grouped;
  }
  async function moveCategory(id,newParentId=null) {
    const list=await categories(),node=list.find(x=>x.id===id),parent=newParentId?list.find(x=>x.id===newParentId):null;
    if(!node)throw new Error('Category not found');
    if(newParentId&&!parent)throw new Error('Destination category not found');
    if(id===newParentId)throw new Error('A category cannot be its own parent');
    let cursor=parent;while(cursor){if(cursor.id===id)throw new Error('Cannot move a category into its descendant');cursor=list.find(x=>x.id===cursor.parentId)}
    node.parentId=parent?.id||null;node.kind=parent?'subcategory':'category';node.updatedAt=Date.now();
    const byId=new Map(list.map(x=>[x.id,x]));
    const rebuild=n=>{const p=n.parentId?byId.get(n.parentId):null;n.displayId=[...(p?[p.displayId]:[]),slug(n.name)].join('-');list.filter(c=>c.parentId===n.id).forEach(rebuild)};
    rebuild(node);const r=await get('localLibrary'),tools=reconcileToolPaths(list,r.localLibrary||[]);await set({[KEY.categories]:list,localLibrary:tools});await syncTools(tools,list);return node;
  }
  async function collections(){if(window.CMJDatabase){try{const db=await window.CMJDatabase.readAll();if(db.initialized)return db.collections||[]}catch{}}const r=await get(KEY.collections);return r[KEY.collections]||[]}
  async function saveCollection(name,toolIds=[]) {
    const all=await collections(),n={id:uuid(),name:String(name||'').trim(),toolIds:[...new Set(toolIds)],createdAt:Date.now(),updatedAt:Date.now()};
    if(!n.name)throw new Error('Collection name is required');
    all.push(n);await set({[KEY.collections]:all});if(window.CMJDatabase){const db=await window.CMJDatabase.readAll();if(db.initialized)await window.CMJDatabase.replaceCollections(all)}return n;
  }
  async function deleteCollection(id){const all=(await collections()).filter(c=>c.id!==id);await set({[KEY.collections]:all});if(window.CMJDatabase){const db=await window.CMJDatabase.readAll();if(db.initialized)await window.CMJDatabase.replaceCollections(all)}}
  async function recordRevision(tool) {
    const r=await get(KEY.revisions),all=r[KEY.revisions]||[];
    const arr=all.filter(x=>x.toolId===tool.id);
    if(arr.length && JSON.stringify(arr[0].snapshot)===JSON.stringify(tool))return;
    all.unshift({id:uuid(),toolId:tool.id,toolName:tool.name,at:Date.now(),snapshot:JSON.parse(JSON.stringify(tool))});
    await set({[KEY.revisions]:all.slice(0,500)});
  }
  async function databaseSnapshot(tools) {
    const cols=await collections();
    const grouped=await syncTools(tools),cats=await categories();
    return {version:'6.1.1',app:'Charlie MJ Tool Archive',exportedAt:new Date().toISOString(),
      database:{categories:cats,collections:cols,categoryCollections:grouped,tools}};
  }
  async function compareDuplicates(url,name='',ignoreId='') {
    const r=await get(['localLibrary','remoteLibrary']),all=[...(r.localLibrary||[]),...(r.remoteLibrary||[])];
    const input=exactUrl(url);
    return all.filter(t=>t.id!==ignoreId).map(t=>{
      const candidate=exactUrl(t.url),same=input===candidate;
      const urlScore=urlSimilarity(url,t.url);
      const nameScore=similarity(name,t.name);
      return {tool:t,exact:same,urlScore,nameScore,score:Math.round(urlScore*.8+nameScore*.2)};
    }).filter(x=>x.exact||x.urlScore>=25||x.nameScore>=65).sort((a,b)=>Number(b.exact)-Number(a.exact)||b.score-a.score).slice(0,8);
  }
  async function exportCategory(categoryId,tools) {
    const cats=await categories(),cat=cats.find(c=>c.id===categoryId);
    if(!cat)throw new Error('Category not found');
    const selected=tools.filter(t=>t.categoryId===categoryId||t.subcategoryId===categoryId);
    return {version:'6.1.1',app:'Charlie MJ Tool Archive',exportType:'category',category:cat,tools:selected,exportedAt:new Date().toISOString()};
  }
  async function importCategory(payload,existing) {
    if(!payload||!Array.isArray(payload.tools))throw new Error('Invalid category JSON');
    const name=payload.category?.name||payload.category||payload.tools[0]?.category||'Imported Category';
    const cat=await ensureCategory(name);
    const exact=new Set(existing.map(t=>exactUrl(t.url)));
    const added=[];
    for(const raw of payload.tools){
      if(!raw?.url||!/^https?:\/\//i.test(raw.url))continue;
      const t={...raw,id:raw.id||uuid(),category:name,categoryId:cat.id};
      if(exact.has(exactUrl(t.url)))continue;
      exact.add(exactUrl(t.url));added.push(t);
    }
    return {category:cat,tools:added};
  }
  window.CMJAdvanced={
    KEY,uuid,slug,exactUrl,similarity,urlSimilarity,suggestLabels,searchScore,ensureInitialized,categories,
    ensureCategory,renameCategory,deleteCategory,moveCategory,enrichTool,syncTools,collections,saveCollection,deleteCollection,
    recordRevision,databaseSnapshot,compareDuplicates,exportCategory,importCategory
  };
})();
