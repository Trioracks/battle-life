import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {publicationPathReason} from './publication/policy.mjs';
import {assertNoLinks,localAssetPath,validateLocalAssetRoot} from '../test/helpers/local-assets.js';
import {BEGINNER_BANK,USER_DRUM_BANK,USER_EXPERIMENTAL_BANK} from '../src/beat-beginner-bank.js';
import {ALL_VOCALS} from '../src/vocal-catalog.js';
import {JURA_EXPERIMENTAL_BANK} from '../src/beat-jura-experimental-bank.js';
import {BUILD_INFO} from '../src/build-info.js';

const audioRoutes=new Set([...BEGINNER_BANK,...USER_DRUM_BANK,...USER_EXPERIMENTAL_BANK,...JURA_EXPERIMENTAL_BANK,...ALL_VOCALS].map(part=>part.path.replace(/^\.\//,'')));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.wav':'audio/wav'};
export async function startPreviewServer({root=fileURLToPath(new URL('../',import.meta.url)),port=4180,prefix='/battle-life/',profile='public-preview',assetRoot=null}={}){
 if(!['public-preview','local-full'].includes(profile))throw new Error('Unknown preview profile');
 if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid port');
 if(!/^\/(?:[a-zA-Z0-9_-]+\/)+$/.test(prefix))throw new Error('Invalid preview prefix');
 root=path.resolve(root);assertNoLinks(root);if(!(await fs.stat(root)).isDirectory())throw new Error('Preview root must be a directory');
 let overlay=null;
 if(profile==='local-full'){
  if(assetRoot===null){const settings=path.join(root,'.local-audio.json');assertNoLinks(settings);assetRoot=JSON.parse(await fs.readFile(settings,'utf8')).assetRoot;}
  overlay=validateLocalAssetRoot(assetRoot);
 }
 const server=createServer(async(req,res)=>{
  try{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
   // Parse the raw request target: URL normalization would hide literal '..'.
   const raw=req.url.split('?')[0],decoded=decodeURIComponent(raw);
   if(!decoded.startsWith(prefix)||/[\\%:\x00-\x1f]/.test(decoded))throw new Error('Unsafe path');
   let relative=decoded.slice(prefix.length);if(!relative)relative='index.html';
   if(relative.split('/').some(p=>!p||p==='.'||p==='..'||/[. ]$/.test(p)))throw new Error('Unsafe path');
   let bytes;
   if(overlay&&relative==='src/build-info.js')bytes=Buffer.from(`export const BUILD_INFO=Object.freeze(${JSON.stringify({...BUILD_INFO,profile:'local-full'})});\n`);
   else if(overlay&&audioRoutes.has(relative))bytes=await fs.readFile(localAssetPath(relative,overlay));
   else{
    const font=/^assets\/fonts\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.woff2?$/.test(relative);
    if(publicationPathReason(relative,'site')&&!font)throw new Error('Not a runtime route');
    const filename=path.resolve(root,...relative.split('/'));if(!filename.startsWith(root+path.sep))throw new Error('Unsafe path');assertNoLinks(filename);
    if(!(await fs.stat(filename)).isFile())throw new Error('Not a regular file');bytes=await fs.readFile(filename);
   }
   res.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 const origin=`http://127.0.0.1:${server.address().port}`;
 return {origin,url:origin+prefix,close:()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)try{
 const options={};for(let i=2;i<process.argv.length;i++){const name=process.argv[i],value=process.argv[++i];if(!value)throw new Error(`Missing ${name}`);if(name==='--profile')options.profile=value;else if(name==='--asset-root')options.assetRoot=value;else if(name==='--port')options.port=Number(value);else throw new Error(`Unknown option ${name}`);}
 const server=await startPreviewServer(options);console.log(`${options.profile||'public-preview'}: ${server.url}`);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await server.close();});
}catch(error){console.error(error.message);process.exitCode=1;}
