// Bounded, lossless LZW over UTF-8 bytes.15-bit symbols avoid UTF-16 surrogates.
// Stored only at the persistence boundary; game snapshots and exports stay JSON.
const PREFIX='BLPC-LZW1:',RESET=32767,LIMIT=64*1024*1024;
function checksum(bytes){let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return (h>>>0).toString(16);}
export function encodePcSave(value){
 const json=JSON.stringify(value);if(json.length<200000)return json;
 const bytes=new TextEncoder().encode(json);if(bytes.length>LIMIT)throw Error('Сохранение превышает поддерживаемый размер.');
 let dictionary=new Map(),next=256,word='';const output=[];
 const emit=code=>output.push(String.fromCharCode(code+32));
 const code=word=>word.length===1?word.charCodeAt(0):dictionary.get(word);
 for(const byte of bytes){const char=String.fromCharCode(byte),joined=word+char;
  if(word===''||dictionary.has(joined)){word=joined;continue;}
  emit(code(word));if(next<RESET)dictionary.set(joined,next++);else {emit(RESET);dictionary=new Map();next=256;}word=char;
 }if(word)emit(code(word));
 const encoded=PREFIX+bytes.length+':'+checksum(bytes)+':'+output.join('');return encoded.length<json.length?encoded:json;
}
export function decodePcSave(raw){
 if(!raw.startsWith(PREFIX))return JSON.parse(raw);
 const header=/^BLPC-LZW1:(\d+):([0-9a-f]{1,8}):/.exec(raw);if(!header)throw Error('Повреждён заголовок сохранения.');
 const expected=Number(header[1]);if(!Number.isSafeInteger(expected)||expected<1||expected>LIMIT)throw Error('Неверный размер сохранения.');
 let dictionary=[],next=256,previous='',length=0;const output=[];
 for(let i=header[0].length;i<raw.length;i++){
  const code=raw.charCodeAt(i)-32;if(code===RESET){dictionary=[];next=256;previous='';continue;}
  const entry=code>=0&&code<256?String.fromCharCode(code):code===next&&previous?previous+previous[0]:dictionary[code];
  if(!entry)throw Error('Повреждён словарь сохранения.');length+=entry.length;if(length>expected)throw Error('Повреждён размер сохранения.');output.push(entry);
  if(previous&&next<RESET)dictionary[next++]=previous+entry[0];previous=entry;
 }
 if(length!==expected)throw Error('Сохранение обрезано.');
 const bytes=Uint8Array.from(output.join(''),c=>c.charCodeAt(0));if(checksum(bytes)!==header[2])throw Error('Контрольная сумма не совпала.');
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
