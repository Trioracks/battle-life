import path from 'node:path';
import { inflateSync } from 'node:zlib';

export const MAX_FILE_BYTES = 95 * 1024 * 1024;
export const MAX_SITE_BYTES = 350 * 1024 * 1024;
const textTypes = new Set(['.html','.css','.js','.mjs','.cjs','.json','.md','.txt','.svg','.py','.ps1','.cmd','.yml','.yaml']);
const runtimeText = new Set(['.html','.css','.js','.mjs','.json','.txt','.svg']);
const binaries = new Set(['.png','.jpg','.jpeg','.glb','.ttf']);
const assetJson = new Set(['assets/apartment/v3/scene.json','assets/apartment/v3/rig.json','assets/models/apartment-first-location.manifest.json','assets/models/avatar.manifest.json','assets/npc-photos/manifest.json','assets/social/photos/manifest.json']);
const rootRuntime = new Set(['index.html','legacy.html','style.css','apartment-v3.css','creator-v12.css','desktop-apps.css','phone-hud.css','rap-dossier.css','rap-notebook.css','social-network.css','underweb-world.css','virtual-pc.css','version.json','release.json','.nojekyll']);
const rootSource = new Set([...rootRuntime,'README.md','AGENTS.md','LICENSE','LICENSE.md','NOTICE','NOTICE.md','package.json','package-lock.json','.gitignore','.local-audio.example.json','Запустить игру.cmd']);

export function publicationPathReason(relativePath, target) {
  if (!['source','site'].includes(target)) return 'unknown publication target';
  if (typeof relativePath !== 'string' || !relativePath || /[\\\x00-\x1f:]/.test(relativePath) || path.posix.isAbsolute(relativePath) || relativePath.split('/').some(p=> !p || p==='.' || p==='..' || /[. ]$/.test(p))) return 'unsafe relative path';
  const parts=relativePath.split('/'); const lower=relativePath.toLowerCase();
  if (parts.some(p=>/^(?:\.git|\.superpowers|\.env(?:\..*)?|\.local-audio\.json|stems|node_modules|dist|artifacts|coverage|caches?|__pycache__|backlog|\.worktrees)$/i.test(p))) return 'excluded folder or local configuration';
  if (/^assets\/apartment\/v3\/(?:geometry|walk)-audit\.json$/i.test(relativePath)) return 'generated QA output';
  if (/\.(?:wav|wave|mp3|flac|ogg|opus|m4a|aac|aif|aiff|aifc|wma|mp4|webm|mov|mkv|midi?|sf2|sfz|blend\d*|zip|7z|rar|tar|gz|bz2|xz|zst|bak|pem|key|pfx|p12|log)$/i.test(lower)) return 'excluded media, archive, backup or secret type';
  const ext=path.posix.extname(lower);
  if (parts.length===1 && (target==='source'?rootSource:rootRuntime).has(relativePath)) return null;
  if (target==='source' && /^\.github\/workflows\/[a-z0-9_-]+\.ya?ml$/i.test(relativePath)) return null;
  if (/^(src|vendor|data)\//.test(relativePath) && runtimeText.has(ext)) return null;
  if (target==='source' && /^(test|tools)\//.test(relativePath) && textTypes.has(ext)) return null;
  if (target==='source' && /^docs\//.test(relativePath) && (ext==='.md' || relativePath==='docs/research/package-one-reference-sources.json' || relativePath==='docs/public-source-provenance.json')) return null;
  if (relativePath==='vendor/three/LICENSE') return null;
  if (/^assets\/(apartment|models|battle-covers|npc-photos|social|ui|fonts)\//.test(relativePath) && (binaries.has(ext) || ['.svg','.txt','.md'].includes(ext) || assetJson.has(relativePath))) return null;
  if (relativePath==='assets/audio/pc/manifest.json' || (target==='source' && /^assets\/audio\/ft\/[^/]+\/manifest\.json$/.test(relativePath))) return null;
  return 'path or type is not on the publication allowlist';
}

const forbiddenMagic=['4f676753','664c6143','494433','504b0304','504b0506','504b0708','1f8b08','377abcaf271c','526172211a07','425a68','fd377a585a00','424c454e444552'].map(hex=>Buffer.from(hex,'hex'));
function mp3FrameLength(bytes) {
  if(bytes.length<4 || bytes[0]!==255 || (bytes[1]&0xe0)!==0xe0 || ((bytes[1]>>3)&3)===1 || ((bytes[1]>>1)&3)===0 || (bytes[2]>>4)===15 || (bytes[2]>>4)===0 || ((bytes[2]>>2)&3)===3) return 0;
  const version=(bytes[1]>>3)&3,layer=(bytes[1]>>1)&3,index=(bytes[2]>>4)-1,padding=(bytes[2]>>1)&1;
  const rates=version===3?(layer===3?[32,64,96,128,160,192,224,256,288,320,352,384,416,448]:layer===2?[32,48,56,64,80,96,112,128,160,192,224,256,320,384]:[32,40,48,56,64,80,96,112,128,160,192,224,256,320]):layer===3?[32,48,56,64,80,96,112,128,144,160,176,192,224,256]:[8,16,24,32,40,48,56,64,80,96,112,128,144,160];
  const sample=[44100,48000,32000][(bytes[2]>>2)&3]/(version===3?1:version===2?2:4);
  return layer===3?(Math.floor(12*rates[index]*1000/sample)+padding)*4:Math.floor((version!==3 && layer===1?72:144)*rates[index]*1000/sample)+padding;
}
function aacFrameLength(bytes) {
  if(bytes.length<7 || bytes[0]!==255 || (bytes[1]&0xf6)!==0xf0 || ((bytes[2]>>2)&15)>=13) return 0;
  const frame=((bytes[3]&3)<<11)|(bytes[4]<<3)|(bytes[5]>>5); return frame>=7?frame:0;
}
function forbiddenSignature(bytes, encoded=false) {
  for (const magic of forbiddenMagic) if (bytes.subarray(0,magic.length).equals(magic)) return true;
  for (const [magic,type] of [['RIFF','WAVE'],['RF64','WAVE'],['FORM','AIFF'],['FORM','AIFC']]) {
    let offset=bytes.indexOf(magic); while(offset!==-1) { if(bytes.toString('ascii',offset+8,offset+12)===type) return true; offset=bytes.indexOf(magic,offset+1); }
  }
  // Encoded URL paths can resemble a sync word. Require a complete frame.
  const mp3Length=mp3FrameLength(bytes),aacLength=aacFrameLength(bytes);
  const mp3=mp3Length>0 && (!encoded || mp3Length<=bytes.length),aac=aacLength>0 && (!encoded || aacLength<=bytes.length);
  const imageBrand=['avif','avis','mif1','msf1','heic','heix'].includes(bytes.toString('ascii',8,12));
  return mp3 || aac || (bytes.length>12 && bytes.toString('ascii',4,8)==='ftyp' && !imageBrand) || bytes.toString('ascii',257,262)==='ustar';
}

function encodedPayloadReason(bytes) {
  const text=bytes.toString('latin1');
  if(/data\s*:\s*(?:audio|video)\//i.test(text)) return 'embedded audio/video data URI';
  for(const match of text.matchAll(/[A-Za-z0-9+/]{24,}={0,2}/g)) if(forbiddenSignature(Buffer.from(match[0],'base64'),true)) return 'embedded encoded media/archive';
  return null;
}

function safeBinaryMetadata(bytes,{scanAudioFrames=true}={}) {
  // Search at every offset within metadata, never inside compressed pixels.
  if(forbiddenMagic.some(magic=>bytes.includes(magic)) || encodedPayloadReason(bytes)) return false;
  // Typed numeric arrays can contain incidental sync-like float bytes.
  if(!scanAudioFrames) return true;
  for(let p=bytes.indexOf(255);p!==-1;p=bytes.indexOf(255,p+1)) {
    const view=bytes.subarray(p),frame=mp3FrameLength(view)||aacFrameLength(view); if(!frame || frame+7>view.length) continue;
    const next=mp3FrameLength(view.subarray(frame))||aacFrameLength(view.subarray(frame)); if(next && frame+next<=view.length) return false;
  }
  return !forbiddenSignature(bytes,true);
}

const pngMetadataChunks=new Set(['cHRM','gAMA','iCCP','sBIT','sRGB','bKGD','hIST','tRNS','pHYs','sPLT','tIME','eXIf','oFFs','tEXt','zTXt','iTXt','caBX']);
function safePngMetadata(kind,bytes) {
  if(!pngMetadataChunks.has(kind) || !safeBinaryMetadata(bytes)) return false;
  // Compressed textual metadata must not conceal a second payload.
  if(kind==='iCCP' || kind==='zTXt') {
    const end=bytes.indexOf(0); if(end<1 || bytes[end+1]!==0) return false;
    try { return safeBinaryMetadata(inflateSync(bytes.subarray(end+2),{maxOutputLength:MAX_FILE_BYTES})); } catch { return false; }
  }
  if(kind==='iTXt') {
    const end=bytes.indexOf(0); if(end<1 || ![0,1].includes(bytes[end+1]) || bytes[end+2]!==0) return false;
    const languageEnd=bytes.indexOf(0,end+3),translatedEnd=bytes.indexOf(0,languageEnd+1); if(languageEnd<0 || translatedEnd<0) return false;
    if(bytes[end+1]===1) try { return safeBinaryMetadata(inflateSync(bytes.subarray(translatedEnd+1),{maxOutputLength:MAX_FILE_BYTES})); } catch { return false; }
  }
  return true;
}

function validJpeg(b) {
  if(b.length<4 || b[0]!==255 || b[1]!==216) return false;
  let p=2,frame=false,scan=false,inScan=false;
  while(p<b.length) {
    if(inScan) {
      p=b.indexOf(255,p); if(p<0 || p+1>=b.length) return false;
      if(b[p+1]===0 || (b[p+1]>=208 && b[p+1]<=215)) { p+=2; continue; }
      inScan=false;
    }
    if(b[p++]!==255) return false; while(b[p]===255) p++;
    const marker=b[p++]; if(marker===217) return frame && scan && p===b.length;
    if(marker===1) continue;
    if(marker===0 || marker===216 || (marker>=208 && marker<=215) || p+2>b.length) return false;
    const size=b.readUInt16BE(p); if(size<2 || p+size>b.length) return false;
    if((marker>=224 && marker<=239 || marker===254) && !safeBinaryMetadata(b.subarray(p+2,p+size))) return false;
    if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
      if(size<11 || !b.readUInt16BE(p+3) || !b.readUInt16BE(p+5) || size!==8+3*b[p+7]) return false; frame=true;
    }
    if(marker===218) { if(!frame || size<6 || size!==6+2*b[p+2]) return false; scan=true; inScan=true; }
    p+=size;
  }
  return false;
}

function paddingOnly(bytes,start,end) {
  return end>=start && end-start<=3 && bytes.subarray(start,end).every(byte=>byte===0);
}

function coveredBinaryRegions(bytes,ranges,start=0) {
  let cursor=start;
  for(const [lo,hi]of ranges.toSorted((a,b)=>a[0]-b[0])) {
    if(lo>cursor && !paddingOnly(bytes,cursor,lo)) return false;
    cursor=Math.max(cursor,hi);
  }
  return paddingOnly(bytes,cursor,bytes.length);
}

function markNumericCoverage(mask,start,end) {
  while(start<end && start%8) { mask[start>>3]|=1<<(start%8); start++; }
  const fullEnd=end-end%8;
  if(start<fullEnd) { mask.fill(255,start>>3,fullEnd>>3); start=fullEnd; }
  while(start<end) { mask[start>>3]|=1<<(start%8); start++; }
}

function safeNumericView(bytes,accessors=[]) {
  if(!safeBinaryMetadata(bytes,{scanAudioFrames:false})) return false;
  if(accessors.some(({start,stride,count,width})=>start===0 && stride===width && count*width===bytes.length)) return true;
  // One bit per view byte, independent of element count or overlapping accessors.
  // At the file budget this is at most 95 MiB / 8; no per-element objects/sort.
  const mask=new Uint8Array(Math.ceil(bytes.length/8));
  for(const {start,stride,count,width}of accessors) {
    if(stride===width) markNumericCoverage(mask,start,start+count*width);
    else for(let i=0,offset=start;i<count;i++,offset+=stride) markNumericCoverage(mask,offset,offset+width);
  }
  let cursor=0;
  while(cursor<bytes.length) {
    if(mask[cursor>>3] & (1<<(cursor%8))) { cursor++; continue; }
    const start=cursor++;
    while(cursor<bytes.length && !(mask[cursor>>3] & (1<<(cursor%8)))) cursor++;
    // Strong/encoded signatures were checked over the entire view above.
    // Fewer than seven bytes cannot hold a complete MP3/AAC frame or container.
    if(cursor-start>=7 && !safeBinaryMetadata(bytes.subarray(start,cursor))) return false;
  }
  return true;
}

function validGlb(b) {
  if(b.length<20 || b.toString('ascii',0,4)!=='glTF' || b.readUInt32LE(4)!==2 || b.readUInt32LE(8)!==b.length) return false;
  let p=12,doc,bin;
  while(p+8<=b.length) {
    const size=b.readUInt32LE(p),type=b.readUInt32LE(p+4); if(size%4 || size>b.length-p-8) return false;
    const bytes=b.subarray(p+8,p+8+size);
    if(!doc) { if(type!==0x4e4f534a || !safeBinaryMetadata(bytes)) return false; try { doc=JSON.parse(bytes.toString('utf8')); } catch { return false; } }
    else if(type===0x004e4942 && !bin) bin=bytes; else return false;
    p+=8+size;
  }
  if(p!==b.length || doc?.asset?.version!=='2.0') return false;
  if(!bin) return !(doc.buffers?.length || doc.bufferViews?.length || doc.images?.length);
  const buffer=doc.buffers?.[0];
  if(doc.buffers.length!==1 || buffer.uri || !Number.isInteger(buffer.byteLength) || buffer.byteLength<0 || !paddingOnly(bin,buffer.byteLength,bin.length)) return false;
  const bytes=bin.subarray(0,buffer.byteLength),views=doc.bufferViews??[],ranges=[],imageViews=new Set(),numericRanges=new Map();
  for(const view of views) {
    const start=view.byteOffset??0,end=start+view.byteLength;
    if(view.buffer!==0 || !Number.isInteger(start) || start<0 || !Number.isInteger(view.byteLength) || view.byteLength<=0 || end>bytes.length) return false;
    ranges.push([start,end]);
  }
  for(const accessor of doc.accessors??[]) {
    const view=views[accessor.bufferView],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16}[accessor.type],unit={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[accessor.componentType];
    if(!view || !width || !unit || !Number.isInteger(accessor.count) || accessor.count<1) return false;
    const start=accessor.byteOffset??0,stride=view.byteStride??width*unit;
    if(!Number.isInteger(start) || start<0 || start%unit || !Number.isInteger(stride) || stride<width*unit || stride%unit || start+(accessor.count-1)*stride+width*unit>view.byteLength) return false;
    const descriptors=numericRanges.get(accessor.bufferView)??[];
    descriptors.push({start,stride,count:accessor.count,width:width*unit});
    numericRanges.set(accessor.bufferView,descriptors);
  }
  for(const image of doc.images??[]) {
    if(image.uri || !Number.isInteger(image.bufferView) || image.bufferView<0 || image.bufferView>=views.length) return false;
    const ext={ 'image/png':'.png','image/jpeg':'.jpg' }[image.mimeType]; if(!ext) return false;
    const [start,end]=ranges[image.bufferView]; if(!validBinary(ext,bytes.subarray(start,end))) return false;
    imageViews.add(image.bufferView);
  }
  for(let i=0;i<ranges.length;i++) if(!imageViews.has(i) && !safeNumericView(bytes.subarray(...ranges[i]),numericRanges.get(i))) return false;
  return coveredBinaryRegions(bytes,ranges);
}

function validTtf(b) {
  if(b.length<12 || b.readUInt32BE(0)!==0x00010000) return false;
  const count=b.readUInt16BE(4),directoryEnd=12+count*16,ranges=[]; if(!count || directoryEnd>b.length) return false;
  for(let p=12;p<directoryEnd;p+=16) {
    const start=b.readUInt32BE(p+8),size=b.readUInt32BE(p+12),end=start+size;
    if(start<directoryEnd || start%4 || end>b.length || !safeBinaryMetadata(b.subarray(start,end))) return false;
    ranges.push([start,end]);
  }
  const sorted=ranges.toSorted((a,b)=>a[0]-b[0]);
  if(sorted.some(([start],i)=>i>0 && start<sorted[i-1][1])) return false;
  return coveredBinaryRegions(b,ranges,directoryEnd);
}

function validBinary(ext,b) {
  if (ext==='.png') {
    if (!b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')) || b.toString('ascii',12,16)!=='IHDR') return false;
    let p=8; while(p+12<=b.length) { const size=b.readUInt32BE(p); if(size>b.length-p-12) return false; const kind=b.toString('ascii',p+4,p+8),payload=b.subarray(p+8,p+8+size); if(kind==='PLTE' && !safeBinaryMetadata(payload,{scanAudioFrames:false})) return false; if(!['IHDR','PLTE','IDAT','IEND'].includes(kind) && !safePngMetadata(kind,payload)) return false; p+=size+12; if(kind==='IEND') return size===0 && p===b.length; } return false;
  }
  if (ext==='.jpg'||ext==='.jpeg') return validJpeg(b);
  if (ext==='.glb') return validGlb(b);
  if (ext==='.ttf') return validTtf(b);
  return false;
}

export function classifyPublicationFile(relativePath, bytes, {target}={}) {
  const reject=reason=>({allowed:false,reason}); const reason=publicationPathReason(relativePath,target); if(reason) return reject(reason);
  if(!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) return reject('file bytes required'); bytes=Buffer.from(bytes);
  if(bytes.length>MAX_FILE_BYTES) return reject('file exceeds 95 MiB budget');
  if(forbiddenSignature(bytes)) return reject('audio, archive or Blender signature');
  // Inspect encoded payloads in binary metadata as well as ordinary text.
  const payloadReason=encodedPayloadReason(bytes); if(payloadReason) return reject(payloadReason);
  const ext=path.posix.extname(relativePath.toLowerCase());
  if(binaries.has(ext)) {
    try { return validBinary(ext,bytes)?{allowed:true,reason:'validated runtime binary'}:reject('invalid binary format'); }
    catch { return reject('invalid binary format'); }
  }
  let text; try { text=new TextDecoder('utf-8',{fatal:true}).decode(bytes); } catch { return reject('unknown binary content'); }
  if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) return reject('binary control bytes in text');
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text) || /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/.test(text)) return reject('credential signature');
  if(ext==='.json') try { JSON.parse(text); } catch { return reject('invalid JSON'); }
  return {allowed:true,reason:'allowlisted UTF-8 text'};
}
