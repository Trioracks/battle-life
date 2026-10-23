// Loopback-only, fixed-output sink. No player storage, arbitrary paths or external writes.
import {createServer} from 'node:http';
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.json':'application/json','.wav':'audio/wav','.mp3':'audio/mpeg'};
const sha=b=>createHash('sha256').update(b).digest('hex');
async function noLinks(file){for(let at=file;at&&at!==path.dirname(at);at=path.dirname(at)){const s=await lstat(at).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(s?.isSymbolicLink())throw Error('symlink rejected');}}
export async function createDemoServer({root=fileURLToPath(new URL('../',import.meta.url))}={}){
const out=path.join(root,'artifacts/abstract-20261020/demos'),fixtures=JSON.parse(await readFile(path.join(out,'fixtures.json'),'utf8')),names=new Set([...fixtures.examples.map(e=>e.label+'.wav'),'render-evidence.json','qa-screenshot.jpg']);
const server=createServer(async(req,res)=>{
 try{
  const port=server.address().port,origin='http://127.0.0.1:'+port;
  if(req.headers.host!=='127.0.0.1:'+port)throw Error('invalid host');const url=new URL(req.url,origin);
  if(req.method==='POST'){
   if(req.headers.origin!==origin)throw Error('invalid origin');const name=url.pathname.replace('/__abstract-demo-output/','');if(!url.pathname.startsWith('/__abstract-demo-output/')||!names.has(name)||url.search)throw Error('output not allowlisted');
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>(name==='qa-screenshot.jpg'?2:20)*1024*1024)throw Error('output too large');chunks.push(chunk);}const bytes=Buffer.concat(chunks);
   if(name.endsWith('.wav')){if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('invalid WAV');}
   else if(name==='qa-screenshot.jpg'){if(bytes.length<100||bytes.readUInt16BE(0)!==0xffd8||bytes[2]!==255||bytes.readUInt16BE(bytes.length-2)!==0xffd9)throw Error('invalid JPEG');}
   else {const evidence=JSON.parse(bytes);if(!Array.isArray(evidence.examples)||!Array.isArray(evidence.errors))throw Error('invalid evidence');}
   const target=path.join(out,name);await noLinks(target);const existing=await readFile(target).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(existing&&!existing.equals(bytes))throw Error('refusing different existing output');if(!existing)await writeFile(target,bytes,{flag:'wx'});
   let priorComparison=null;
   if(name.endsWith('.wav')){const prior=await readFile(path.join(out,name.replace('.wav','-first-attempt.wav'))).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(prior){let maxPcm16Delta=0,changedSamples=0;const sameLength=prior.length===bytes.length;for(let i=44;i<Math.min(prior.length,bytes.length)-1;i+=2){const d=Math.abs(prior.readInt16LE(i)-bytes.readInt16LE(i));maxPcm16Delta=Math.max(maxPcm16Delta,d);if(d)changedSamples++;}priorComparison={priorSha256:sha(prior),sameLength,maxPcm16Delta,changedSamples,comparedSamples:(Math.min(prior.length,bytes.length)-44)/2};}}
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({path:target,sha256:sha(bytes),bytes:bytes.length,priorComparison}));return;
  }
  if(req.method!=='GET')throw Error('method rejected');const pathname=decodeURIComponent(url.pathname),target=path.resolve(root,'.'+pathname);if(!target.startsWith(root)||pathname.includes('..'))throw Error('invalid path');
  if(!/^\/(?:src|assets|stems)\//.test(pathname)&&!['/tools/abstract-demo.html','/tools/abstract-demo-render.mjs','/artifacts/abstract-20261020/demos/fixtures.json'].includes(pathname))throw Error('resource not allowlisted');
  await noLinks(target);const bytes=await readFile(target);res.setHeader('Content-Type',mime[path.extname(target)]??'application/octet-stream');res.end(bytes);
 }catch(error){res.writeHead(400,{'Content-Type':'text/plain'});res.end(error.message);}
});return server;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const server=await createDemoServer();server.listen(4192,'127.0.0.1',()=>console.log('http://127.0.0.1:4192/tools/abstract-demo.html'));}
