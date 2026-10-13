#!/usr/bin/env python3
"""Charlie MJ Tool Archive Native Messaging host (Windows/macOS/Linux).
   The extension chooses a root folder; this host writes only safe relative paths beneath it.
"""
import json, os, sys, struct, traceback

def read_message():
    raw=sys.stdin.buffer.read(4)
    if not raw: return None
    if len(raw)!=4: raise EOFError('Incomplete message header')
    size=struct.unpack('<I',raw)[0]
    if size>1024*1024: raise ValueError('Message exceeds 1 MiB')
    data=sys.stdin.buffer.read(size)
    if len(data)!=size: raise EOFError('Incomplete message body')
    return json.loads(data.decode('utf-8'))

def send(obj):
    data=json.dumps(obj,ensure_ascii=False).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('<I',len(data))+data);sys.stdout.buffer.flush()

def safe_target(root, rel):
    rel=str(rel or '').replace('\\','/')
    parts=[p for p in rel.split('/') if p not in ('','.','..')]
    if not parts or any(':' in p for p in parts): raise ValueError('Invalid relative path')
    base=os.path.realpath(root); target=os.path.realpath(os.path.join(base,*parts))
    if os.path.commonpath([base,target])!=base: raise ValueError('Path escapes portable data folder')
    return target

def main():
    pending = {}
    while True:
        msg=read_message()
        if msg is None: break
        try:
            action=msg.get('action')
            if action=='ping': send({'ok':True,'host':'Charlie MJ Tool Archive Native Helper','version':'1.0.0'}); continue
            root=os.path.abspath(os.path.expanduser(str(msg.get('root') or '')))
            drive,tail=os.path.splitdrive(root)
            if not root or (drive and tail in ('\\','/','')) or root==os.path.abspath(os.sep): raise ValueError('A dedicated data folder path is required')
            if action=='writeFileStart':
                rel=str(msg.get('path') or '')
                safe_target(root,rel)
                pending[(root,rel)]=[]
                send({'ok':True,'started':rel}); continue
            if action=='writeFileChunk':
                key=(root,str(msg.get('path') or ''))
                if key not in pending: raise ValueError('No active chunked file write')
                chunk=msg.get('chunk','')
                if not isinstance(chunk,str): raise ValueError('Chunk must be text')
                pending[key].append(chunk)
                send({'ok':True,'chunkReceived':True}); continue
            if action=='writeFileEnd':
                key=(root,str(msg.get('path') or ''))
                if key not in pending: raise ValueError('No active chunked file write')
                msg={'action':'writeFile','root':root,'path':key[1],'content':''.join(pending.pop(key))}
                action='writeFile'
            if action=='readFile':
                target=safe_target(root,msg.get('path') or 'profile-data.json')
                if not os.path.isfile(target): send({'ok':True,'found':False,'content':'','eof':True,'nextOffset':0}); continue
                with open(target,'r',encoding='utf-8') as source: content=source.read()
                offset=max(0,int(msg.get('offset') or 0)); limit=min(120000,max(1000,int(msg.get('limit') or 120000)))
                chunk=content[offset:offset+limit]; next_offset=offset+len(chunk)
                send({'ok':True,'found':True,'content':chunk,'eof':next_offset>=len(content),'nextOffset':next_offset}); continue
            if action=='inspect':
                profile_path=safe_target(root,'profile-data.json'); index_path=safe_target(root,'database/category-index.json')
                profile=json.load(open(profile_path,encoding='utf-8')) if os.path.isfile(profile_path) else {}
                index=json.load(open(index_path,encoding='utf-8')) if os.path.isfile(index_path) else {}
                missing=[]
                for item in index.get('categories',[]):
                    rel=item.get('path')
                    if rel and not os.path.isfile(safe_target(root,rel)): missing.append(rel)
                seen=set(); duplicates=[]
                for tool in profile.get('localLibrary',[]):
                    key=str(tool.get('url','')).strip().lower().rstrip('/')
                    if key and key in seen: duplicates.append(key)
                    if key: seen.add(key)
                send({'ok':True,'profileTools':len(profile.get('localLibrary',[])),'indexCategories':len(index.get('categories',[])),'missingFiles':missing,'duplicateUrls':duplicates,'profilePresent':bool(profile)}); continue
            if action!='writeFile': raise ValueError('Unsupported action')
            target=safe_target(root,msg.get('path'))
            os.makedirs(os.path.dirname(target),exist_ok=True)
            content=msg.get('content','')
            if not isinstance(content,str): raise ValueError('File content must be text')
            # When the category index changes, remove category files no longer referenced
            # (e.g. deleted/renamed categories). Only paths previously recorded by our own index.
            if str(msg.get('path'))=='database/category-index.json' and os.path.isfile(target):
                try:
                    with open(target,'r',encoding='utf-8') as oldf: old=json.load(oldf)
                    new=json.loads(content); keep={x.get('path') for x in new.get('categories',[]) if x.get('path')}
                    for item in old.get('categories',[]):
                        rel=item.get('path')
                        if rel and rel not in keep:
                            stale=safe_target(root,rel)
                            if os.path.isfile(stale): os.remove(stale)
                except Exception: pass
            tmp=target+'.cmj-tmp'
            with open(tmp,'w',encoding='utf-8',newline='\n') as f: f.write(content); f.flush(); os.fsync(f.fileno())
            os.replace(tmp,target)
            send({'ok':True,'path':msg.get('path')})
        except Exception as exc:
            send({'ok':False,'error':str(exc)})

if __name__=='__main__':
    try: main()
    except Exception: traceback.print_exc(file=sys.stderr); sys.exit(1)
