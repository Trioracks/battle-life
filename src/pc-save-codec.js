// Bounded, lossless LZW over UTF-8 bytes.15-bit symbols avoid UTF-16 surrogates.
// Stored only at the persistence boundary; game snapshots and exports stay JSON.
const PREFIX='BLPC-LZW1:',RESET=32767,LIMIT=64*1024*1024;
const PARTS='BLPC-PARTS1:';
const encodedBytes=text=>text.startsWith(PREFIX)?Number(/^BLPC-LZW1:(\d+):/.exec(text)?.[1]):new TextEncoder().encode(text).length;
function checksum(bytes){let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return (h>>>0).toString(16);}
export function encodePcSave(value){
 return encodeJson(JSON.stringify(value));
}
function encodeJson(json){
 if(json.length<200000)return json;
 const bytes=new TextEncoder().encode(json);if(bytes.length>LIMIT)throw Error('Сохранение превышает поддерживаемый размер.');
 // Same LZW stream, but dictionary keys are (prefix code, byte), not growing
 // binary strings. Bounded typed tables avoid millions of string allocations.
 const keys=new Int32Array(65536),codes=new Uint16Array(65536),output=[],chunk=[];
 let next=256,word=bytes[0];
 const emit=code=>{chunk.push(code+32);if(chunk.length===8192){output.push(String.fromCharCode(...chunk));chunk.length=0;}};
 for(let i=1;i<bytes.length;i++){
  const byte=bytes[i],key=(word*256+byte)+1;let slot=Math.imul(key,0x9e3779b1)>>>16;
  while(keys[slot]&&keys[slot]!==key)slot=(slot+1)&65535;
  if(keys[slot]===key){word=codes[slot];continue;}
  emit(word);if(next<RESET){keys[slot]=key;codes[slot]=next++;}else{emit(RESET);keys.fill(0);next=256;}word=byte;
 }
 emit(word);if(chunk.length)output.push(String.fromCharCode(...chunk));
 const encoded=PREFIX+bytes.length+':'+checksum(bytes)+':'+output.join('');return encoded.length<json.length?encoded:json;
}
// One localStorage write still commits the entire snapshot. Only the two large
// historical sections reuse compression, keyed by content (not mutable identity).
export function createPcSnapshotEncoder(){
 const cache=new Map();
 return (value,prepared)=>{
  const parts={},base={...value};let size=0;
  for(const key of ['trackVersions','judging']){
   const known=prepared?.get(key),json=known?.value===value[key]?known.json:JSON.stringify(value[key]??{}),old=cache.get(key);size+=json.length;
   const encoded=known?.value===value[key]&&typeof known.encoded==='string'?known.encoded:old?.json===json?old.encoded:encodeJson(json);cache.set(key,{json,encoded});parts[key]=encoded;delete base[key];
  }
  if(size<200000)return encodePcSave(value);
  parts.base=encodePcSave(base);
  if(Object.values(parts).reduce((total,text)=>total+encodedBytes(text),0)>LIMIT)throw Error('Сохранение превышает поддерживаемый размер.');
  return PARTS+JSON.stringify(parts);
 };
}
export function decodePcSave(raw){
 if(raw.startsWith(PARTS)){
  if(raw.length>LIMIT)throw Error('Сохранение превышает поддерживаемый размер.');
  const parts=JSON.parse(raw.slice(PARTS.length));let size=0;
  for(const key of ['base','trackVersions','judging']){
   const text=parts?.[key];if(typeof text!=='string'||text.startsWith(PARTS))throw Error('Повреждена секция сохранения.');
   size+=encodedBytes(text);
  }
  if(!Number.isSafeInteger(size)||size>LIMIT)throw Error('Неверный размер секций сохранения.');
  const base=decodePcSave(parts.base);if(!base||base.version!==1)throw Error('Повреждена основа сохранения.');
  return {...base,trackVersions:decodePcSave(parts.trackVersions),judging:decodePcSave(parts.judging)};
 }
 if(!raw.startsWith(PREFIX))return JSON.parse(raw);
 const header=/^BLPC-LZW1:(\d+):([0-9a-f]{1,8}):/.exec(raw);if(!header)throw Error('Повреждён заголовок сохранения.');
 const expected=Number(header[1]);if(!Number.isSafeInteger(expected)||expected<1||expected>LIMIT)throw Error('Неверный размер сохранения.');
 const prefixes=new Uint16Array(RESET),suffixes=new Uint8Array(RESET),stack=new Uint8Array(RESET),bytes=new Uint8Array(expected);
 let next=256,previous=-1,length=0,first=0;
 for(let i=header[0].length;i<raw.length;i++){
  const code=raw.charCodeAt(i)-32;if(code===RESET){next=256;previous=-1;continue;}
  if(code<0||code>next||code===next&&previous<0)throw Error('Повреждён словарь сохранения.');
  let current=code,size=0;if(code===next){stack[size++]=first;current=previous;}
  while(current>=256){if(current>=next||size>=RESET-1)throw Error('Повреждён словарь сохранения.');stack[size++]=suffixes[current];current=prefixes[current];}
  first=current;stack[size++]=first;if(length+size>expected)throw Error('Повреждён размер сохранения.');
  while(size)bytes[length++]=stack[--size];
  if(previous>=0&&next<RESET){prefixes[next]=previous;suffixes[next++]=first;}previous=code;
 }
 if(length!==expected)throw Error('Сохранение обрезано.');
 if(checksum(bytes)!==header[2])throw Error('Контрольная сумма не совпала.');
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
