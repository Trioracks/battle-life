import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {git} from './audit-publication.mjs';
import {publicationPathReason,classifyPublicationFile,MAX_FILE_BYTES,MAX_SITE_BYTES} from './publication/policy.mjs';

const VERSION='0.1.0-preview.1';
const ownName='public-preview.owner.json';
const sha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
async function noLinks(absolute){
 const parsed=path.parse(absolute);let current=parsed.root;
 for(const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)){
  current=path.join(current,part);try{if((await fs.lstat(current)).isSymbolicLink())throw Error(`Linked build path: ${current}`);}catch(e){if(e.code!=='ENOENT')throw e;}
 }
}
async function exists(filename){try{await fs.lstat(filename);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
function withoutComments(source){
 let result='',i=0;
 while(i<source.length){
  const char=source[i];
  if(char==='"'||char==="'"||char==='`'){
   const quote=char;result+=source[i++];while(i<source.length){const next=source[i++];result+=next;if(next==='\\'&&i<source.length)result+=source[i++];else if(next===quote)break;}
  }else if(source.startsWith('//',i)){while(i<source.length&&source[i]!=='\n'){result+=' ';i++;}}
  else if(source.startsWith('/*',i)){const end=source.indexOf('*/',i+2),stop=end<0?source.length:end+2;result+=source.slice(i,stop).replace(/[^\n]/g,' ');i=stop;}
  else result+=source[i++];
 }
 return result;
}

// All paths are verified against a case-sensitive inventory, including on Windows.
export async function buildPreview({root=fileURLToPath(new URL('../',import.meta.url)),outDir,revision,sourceCommit,profile='public-preview',builtAt=new Date().toISOString()}={}){
 root=path.resolve(root);const designated=path.join(root,'dist','public-preview');outDir=path.resolve(outDir??designated);
 if(outDir!==designated)throw Error('Output must be the designated owned dist/public-preview directory');
 if(profile!=='public-preview')throw Error('Only public-preview artifacts may be built');
 await noLinks(root);await noLinks(outDir);
 const head=git(root,'rev-parse','HEAD');revision??=head;
 if(!sha(revision)||revision!==head)throw Error('revision must be the actual public Git HEAD');
 const provenance=JSON.parse(await fs.readFile(path.join(root,'docs/public-source-provenance.json'),'utf8'));
 sourceCommit??=provenance.sourceCommit;if(!sha(sourceCommit)||sourceCommit!==provenance.sourceCommit)throw Error('sourceCommit must match public source provenance');
 if(typeof builtAt!=='string'||!Number.isFinite(Date.parse(builtAt)))throw Error('Invalid build timestamp');
 const ownerFile=path.join(root,'dist',ownName),owner={root,outDir,format:1};await noLinks(ownerFile);
 const hadOutput=await exists(outDir);
 if(hadOutput){
  if(!(await fs.lstat(outDir)).isDirectory())throw Error('Output is not an owned directory');
  let previous;try{previous=JSON.parse(await fs.readFile(ownerFile,'utf8'));}catch{throw Error('Refusing to replace unowned output');}
  if(JSON.stringify(previous)!==JSON.stringify(owner))throw Error('Refusing to replace unowned output');
 }
 const inventory=new Map();
 async function walk(relative=''){
  for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})){
   const name=relative?relative+'/'+entry.name:entry.name;
   if(entry.isDirectory()){
    if((!relative&&['src','vendor','data','assets'].includes(entry.name))||relative&& !/^assets\/audio(?:\/|$)/.test(name))await walk(name);
    else if(name==='assets/audio')await walk(name);
    else if(name==='assets/audio/pc')await walk(name);
   }else if(!publicationPathReason(name,'site')&&name!=='legacy.html'){
    if(entry.isSymbolicLink())throw Error(`Linked runtime input: ${name}`);
    const info=await fs.lstat(path.join(root,name));if(!info.isFile())throw Error(`Non-regular runtime input: ${name}`);inventory.set(name,info.size);
   }
  }
 }
 await walk();
 const selected=new Set(),contents=new Map();let total=0;
 // Dynamic data/media are copied as reviewed inventories, not guessed from a
 // particular playthrough. Audio catalog strings deliberately remain text only.
 function select(name){
  if(selected.has(name))return;
  if(!inventory.has(name))throw Error(`Missing or excluded runtime dependency: ${name}`);
  const size=inventory.get(name);if(size>MAX_FILE_BYTES)throw Error(`${name}: exceeds 95 MiB file budget`);
  total+=size;if(total>MAX_SITE_BYTES)throw Error('Artifact exceeds 350 MiB total budget');selected.add(name);
 }
 for(const name of inventory.keys())if(/^(?:assets|data)\//.test(name)||name==='vendor/three/LICENSE')select(name);
 select('index.html');
 async function bytes(name){
  if(!contents.has(name)){
   const data=await fs.readFile(path.join(root,name)),decision=classifyPublicationFile(name,data,{target:'site'});
   if(!decision.allowed)throw Error(`${name}: ${decision.reason}`);contents.set(name,data);
  }return contents.get(name);
 }
 const html=(await bytes('index.html')).toString();if(/legacy\.html/.test(html))throw Error('Public index must not link legacy.html');
 const importMapMatch=html.match(/<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
 const imports=importMapMatch?JSON.parse(importMapMatch[1]).imports??{}:{};
 function reference(raw,from,{module=false,base}={}){
  if(/^(?:data:|blob:|#)/i.test(raw))return;
  if(/^[a-z][a-z0-9+.-]*:|^\/\//i.test(raw))throw Error(`Non-local runtime dependency in ${from}: ${raw}`);
  if(!raw.startsWith('.')&&!raw.startsWith('assets/')&&!base&&module){
   const key=Object.keys(imports).sort((a,b)=>b.length-a.length).find(key=>raw===key||key.endsWith('/')&&raw.startsWith(key));
   if(!key)throw Error(`Unmapped module in ${from}: ${raw}`);return reference(imports[key]+raw.slice(key.length),'index.html');
  }
  if(raw.startsWith('/'))throw Error(`Root-relative dependency in ${from}: ${raw}`);
  const clean=decodeURIComponent(raw.split(/[?#]/)[0]);
  const name=path.posix.normalize(path.posix.join(base??(raw.startsWith('assets/')||raw.startsWith('./assets/')?'':path.posix.dirname(from)),clean));
  if(name.startsWith('../')||name==='..')throw Error(`Escaping dependency in ${from}: ${raw}`);
  if(/^assets\/audio\//.test(name)&&name!=='assets/audio/pc/manifest.json')return;
  select(name);
 }
 for(const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g))reference(match[1],'index.html');
 for(const value of Object.values(imports))if(!value.endsWith('/'))reference(value,'index.html');
 const visited=new Set();
 while([...selected].some(name=>!visited.has(name))){
  for(const name of [...selected]){
   if(visited.has(name))continue;visited.add(name);
   if(!/\.(?:js|mjs|css|json|svg|html|txt|md)$/.test(name))continue;
   const original=(await bytes(name)).toString(),text=/\.(?:js|mjs|css)$/.test(name)?withoutComments(original):original;
   if(/\.(?:js|mjs)$/.test(name)){
    for(const pattern of [/\bimport\s+(?:[^;'"()]*?\bfrom\s*)?["']([^"']+)["']/g,/\bimport\s*\(\s*["']([^"']+)["']/g,/\bexport\s+(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s*["']([^"']+)["']/g])for(const m of text.matchAll(pattern))reference(m[1],name,{module:true});
    for(const m of text.matchAll(/new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url/g))reference(m[1],name);
    for(const m of text.matchAll(/new\s+(?:Shared)?Worker\(\s*["']([^"']+)["']/g))reference(m[1],'index.html');
    for(const m of text.matchAll(/["'`](\.?\/?assets\/[^"'`\s]+\.(?:json|png|jpg|jpeg|glb|svg|ttf)(?:[?#][^"'`\s]*)?)["'`]/g))reference(m[1],name);
   }
   if(name.endsWith('.css'))for(const m of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)|@import\s*["']([^"']+)["']/g))reference(m[1]??m[2],name);
   if(name.endsWith('.json')&&!name.startsWith('assets/audio/')){
    const scene=name==='assets/apartment/v3/scene.json',doc=JSON.parse(text);
    function values(value){
     if(typeof value==='string'){
      if(/^(?:\.\/)?assets\/[^\s]+\.(?:json|png|jpg|jpeg|glb|svg|ttf)$/.test(value))reference(value,name);
      else if(/^[^/\s]+\.(?:png|jpg|jpeg|glb|svg|ttf)$/.test(value)&&name.startsWith('assets/'))reference(value,name,{base:scene?(doc.assetBase??'assets/apartment/v3/'):path.posix.dirname(name)});
     }else if(value&&typeof value==='object')Object.values(value).forEach(values);
    }values(doc);
   }
  }
 }
 // IDs select these icons at runtime; fail if any declared ID loses its asset.
 if(selected.has('src/virtual-pc-icons.js')){
  const text=(await bytes('src/virtual-pc-icons.js')).toString(),known=text.match(/const known=\[([^\]]+)\]/);
  if(!known)throw Error('Cannot validate PC icon inventory');for(const m of known[1].matchAll(/'([^']+)'/g))select(`assets/ui/virtual-pc/icons/${m[1]}.svg`);
 }
 if([...selected].some(name=>name.startsWith('vendor/three/')))select('vendor/three/LICENSE');
 for(const name of selected)if(name.endsWith('.ttf'))select(path.posix.dirname(name)+'/OFL.txt');
 const manifest={version:VERSION,revision,sourceCommit,profile,builtAt};
 const generated=new Map([['release.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n')],['src/build-info.js',Buffer.from(`export const BUILD_INFO=Object.freeze(${JSON.stringify(manifest)});\n`)],['.nojekyll',Buffer.alloc(0)]]);
 const files=[];total=0;
 for(const name of [...new Set([...selected,...generated.keys()])].sort()){
  const data=generated.get(name)??await bytes(name),decision=classifyPublicationFile(name,data,{target:'site'});
  if(!decision.allowed)throw Error(`${name}: ${decision.reason}`);
  total+=data.length;if(total>MAX_SITE_BYTES)throw Error('Artifact exceeds 350 MiB total budget');files.push({path:name,size:data.length,sha256:createHash('sha256').update(data).digest('hex')});
 }
 await fs.mkdir(path.join(root,'dist'),{recursive:true});await noLinks(path.join(root,'dist'));
 const stage=await fs.mkdtemp(path.join(root,'dist','.public-preview-stage-'));
 try{
  for(const file of files){const destination=path.join(stage,file.path);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,generated.get(file.path)??await bytes(file.path));}
  if(hadOutput){await noLinks(outDir);async function check(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.isSymbolicLink())throw Error('Linked owned output');if(e.isDirectory())await check(path.join(dir,e.name));}}await check(outDir);await fs.rm(outDir,{recursive:true});}
  await fs.rename(stage,outDir);await fs.writeFile(ownerFile,JSON.stringify(owner));
  const result={files,totalBytes:total,manifest};await fs.writeFile(path.join(root,'dist','public-preview-build-report.json'),JSON.stringify(result,null,2)+'\n');return result;
 }finally{await fs.rm(stage,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)try{
 if(process.argv.length>2)throw Error('build:preview accepts no profile or path overrides');
 const result=await buildPreview();console.log(`Built ${result.files.length} files, ${result.totalBytes} bytes, public-preview ${result.manifest.revision.slice(0,7)}`);
}catch(error){console.error(error.message);process.exitCode=1;}
