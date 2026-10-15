import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {withBrowserWatchdog} from './qa/browser-watchdog.mjs';

const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/zubko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),output=resolve(root,process.env.SOCIAL_BACKGROUND_QA_DIR||'artifacts/dossier-weekplay/task-3');
const port=Number(process.env.SOCIAL_BACKGROUND_QA_PORT||4196);assert.ok(Number.isInteger(port)&&port>=4193&&port<=65535);
const base='http://127.0.0.1:'+port,mime={'.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.wav':'audio/wav'};
await mkdir(output+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=output+'/browser-temp';
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,base).pathname;
  if(pathname==='/__archive-audio'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><meta charset="utf-8"><title>Isolated archive audio QA</title>');return;}
  const path=resolve(root,'.'+decodeURIComponent(pathname));
  if(!path.startsWith(resolve(root)+sep)){res.writeHead(403);res.end();return;}
  const bytes=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end();}
});
let browser;
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',yes);});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext(),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
 await page.goto(base+'/__archive-audio');
 const evidence=await withBrowserWatchdog(()=>page.evaluate(async()=>{
  const [{SOCIAL_COMMUNITIES},{backgroundAudioDescriptor},{BeatAudio},{exportedSubmissionFixture}]=await Promise.all([
   import('/src/social-catalog.js?rev=43'),import('/src/social-background-audio.js?rev=43'),import('/src/beat-audio.js?rev=43'),import('/test/helpers/submission-fixtures.js'),
  ]);
  const svgPath='/assets/ui/virtual-pc/icons/dossier.svg',svgResponse=await fetch(svgPath),image=new Image();image.src=svgPath;await image.decode();
  const svg={mime:svgResponse.headers.get('content-type'),width:image.naturalWidth,height:image.naturalHeight};
  const saved=exportedSubmissionFixture({mixed:true}),before=JSON.stringify(saved),rows=[],rate=44100;
  function stats(channels,start=0,end=channels[0].length){
   let square=0,peak=0,nonfinite=0,clipped=0;
   for(const samples of channels)for(let i=start;i<end;i++){
    const x=samples[i];if(!Number.isFinite(x)){nonfinite++;continue;}square+=x*x;peak=Math.max(peak,Math.abs(x));if(Math.abs(x)>=1)clipped++;
   }
   return {rms:Math.sqrt(square/((end-start)*channels.length)),peak,nonfinite,clipped};
  }
  for(const item of SOCIAL_COMMUNITIES.flatMap(c=>c.audio)){
   const descriptor=backgroundAudioDescriptor(item.id),offline=new OfflineAudioContext(2,Math.ceil((descriptor.durationSeconds+.08)*rate),rate),audio=new BeatAudio();audio.context=offline;audio.unlock=async()=>{};
   try{
    if(!await audio.playDescriptor(descriptor))throw Error(audio.error);
    const sources=audio.sources.map((source,i)=>({id:descriptor.parts[i].id,rate:source.buffer.sampleRate,frames:source.buffer.length,loopEnd:source.loopEnd,sections:[[0,2],[2,4],[6,2]].map(([start,bars])=>stats(Array.from({length:source.buffer.numberOfChannels},(_,ch)=>source.buffer.getChannelData(ch)),Math.round(start*8/3*rate),Math.round((start+bars)*8/3*rate)))}));
    const rendered=await offline.startRendering(),offset=Math.round(.04*rate),length=Math.round(descriptor.durationSeconds*rate),channels=Array.from({length:rendered.numberOfChannels},(_,ch)=>rendered.getChannelData(ch).slice(offset,offset+length));
    const joined=new Float32Array(channels.length*length);channels.forEach((samples,ch)=>joined.set(samples,ch*length));
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',joined.buffer)),b=>b.toString(16).padStart(2,'0')).join('');
    rows.push({id:item.id,durationSeconds:descriptor.durationSeconds,rate,frames:length,hash,...stats(channels),sections:[[0,2],[2,4],[6,2]].map(([start,bars])=>stats(channels,Math.round(start*8/3*rate),Math.round((start+bars)*8/3*rate))),sources});
   // OfflineAudioContext has no close(); release the graph/worker explicitly.
   }finally{audio.stop();audio.pcm.dispose();}
  }
  return {origin:location.origin,svg,rows,savedDescriptorsUnchanged:JSON.stringify(saved)===before,subjectiveListening:false};
 }),browser);
 assert.equal(evidence.svg.mime,'image/svg+xml');assert.ok(evidence.svg.width>0&&evidence.svg.height>0);assert.equal(evidence.savedDescriptorsUnchanged,true);
 assert.equal(evidence.rows.length,6);assert.equal(new Set(evidence.rows.map(row=>row.hash)).size,6);
 for(const row of evidence.rows){
  assert.ok(Math.abs(row.durationSeconds-64/3)<1e-9);assert.equal(row.nonfinite,0);assert.equal(row.clipped,0);assert.ok(row.peak>0&&row.peak<1);
  for(const section of row.sections){assert.ok(section.rms>.0001);assert.equal(section.nonfinite,0);assert.equal(section.clipped,0);}
  assert.deepEqual([0,1,2].map(i=>row.sources.filter(source=>source.sections[i].rms>.0001).length),[1,3,1]);
  for(const source of row.sources){assert.equal(source.rate,44100);assert.equal(source.frames,940800);assert.ok(Math.abs(source.loopEnd-64/3)<1e-9);}
 }
 assert.deepEqual(errors,[]);await writeFile(output+'/native-pcm-evidence.json',JSON.stringify({...evidence,errors},null,2));
 console.log(JSON.stringify({passed:true,origin:evidence.origin,rows:evidence.rows.map(({id,hash,peak,rms,sections})=>({id,hash,peak,rms,sectionRms:sections.map(s=>s.rms)})),subjectiveListening:false}));
 await context.close();
}finally{
 try{await browser?.close();}finally{server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve));}
}
