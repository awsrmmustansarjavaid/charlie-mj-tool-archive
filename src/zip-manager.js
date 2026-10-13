/* Minimal dependency-free ZIP archive helper (store/deflate read, store write). */
(() => {
 const enc=new TextEncoder(),dec=new TextDecoder();
 const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
 const crc32=b=>{let c=0xffffffff;for(const v of b)c=crcTable[(c^v)&255]^(c>>>8);return(c^0xffffffff)>>>0};
 const u16=(v)=>{const b=new Uint8Array(2);new DataView(b.buffer).setUint16(0,v,true);return b};
 const u32=(v)=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,v,true);return b};
 const join=parts=>{const n=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out};
 async function create(files){
  const locals=[],centrals=[];let offset=0;
  for(const file of files){
   const name=enc.encode(file.name),data=file.data instanceof Uint8Array?file.data:enc.encode(String(file.data)),crc=crc32(data);
   const local=join([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
   locals.push(local);
   const central=join([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
   centrals.push(central);offset+=local.length;
  }
  const centralBytes=join(centrals),localBytes=join(locals);
  const end=join([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralBytes.length),u32(localBytes.length),u16(0)]);
  return new Blob([localBytes,centralBytes,end],{type:'application/zip'});
 }
 async function read(buffer){
  const b=new Uint8Array(buffer),v=new DataView(buffer);let eocd=-1;
  for(let i=b.length-22;i>=Math.max(0,b.length-65558);i--){if(v.getUint32(i,true)===0x06054b50){eocd=i;break}}
  if(eocd<0)throw new Error('Invalid ZIP: end record not found');
  const count=v.getUint16(eocd+10,true);let pos=v.getUint32(eocd+16,true);const out=[];
  for(let i=0;i<count;i++){
   if(v.getUint32(pos,true)!==0x02014b50)throw new Error('Invalid ZIP directory');
   const method=v.getUint16(pos+10,true),size=v.getUint32(pos+20,true),nameLen=v.getUint16(pos+28,true),extraLen=v.getUint16(pos+30,true),commentLen=v.getUint16(pos+32,true),localOffset=v.getUint32(pos+42,true);
   const name=dec.decode(b.slice(pos+46,pos+46+nameLen));
   const lp=localOffset,ln=v.getUint16(lp+26,true),le=v.getUint16(lp+28,true),start=lp+30+ln+le;
   let data=b.slice(start,start+size);
   if(method===8){if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot decompress this ZIP method');const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));data=new Uint8Array(await new Response(stream).arrayBuffer())}
   else if(method!==0)throw new Error(`Unsupported ZIP compression method: ${method}`);
   out.push({name,data,text:()=>dec.decode(data)});
   pos+=46+nameLen+extraLen+commentLen;
  }
  return out;
 }
 window.CMJZip={create,read};
})();
