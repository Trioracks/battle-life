// Standalone native audio QA; isolated origin and D: profile, no user save access.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {resolve,extname,relative} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/zubko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=resolve('.'),out=resolve('artifacts/user-experimental-v1/native'),base='http://127.0.0.1:4192';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));if(relative(root,path).startsWith('..'))throw Error('outside');const body=await readFile(path);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.mjs':'text/javascript','.wav':'audio/wav','.json':'application/json'})[extname(path)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise((yes,no)=>{server.once('error',no);server.listen(4192,'127.0.0.1',yes);});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--autoplay-policy=no-user-gesture-required']});
const errors=[];
async function page(){const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));await p.route('**/__bank-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated experimental bank audio QA</title>'}));await p.goto(base+'/__bank-qa');return p;}
async function legacyRender(p){return p.evaluate(async()=>{
 const [{submissionFixture},{createAudioExport},{BeatAudio}]=await Promise.all([import('/test/helpers/submission-fixtures.js'),import('/src/pc-audio-exports.js'),import('/src/beat-audio.js')]);
 let s=submissionFixture({mixed:true}),b=s.projects.find(p=>p.id==='beat');b.drumId='user-drums-20261012-03';b.audio.themeId='beginner-theme-16';b.audio.arrangementId='beginner-arrangement-17';delete b.songForm;
 const r=createAudioExport(s,{id:'legacy-export',projectId:'beat',kind:'track',folderId:'exports',filename:'legacy.wav',nowMinute:600});if(!r.ok)throw Error(r.reason);
 const descriptor=r.state.audioExports.files[0].descriptor,c=new OfflineAudioContext(2,943005,44100),a=new BeatAudio();a.unlock=async()=>{a.context=c;};
 if(!await a.playDescriptor(descriptor))throw Error(a.error);
 const prepared=[];for(const source of a.sources)for(let ch=0;ch<source.buffer.numberOfChannels;ch++)prepared.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',source.buffer.getChannelData(ch))),x=>x.toString(16).padStart(2,'0')).join(''));
 const buf=await c.startRendering();a.stop();a.pcm.dispose();
 const hashes=[];for(let ch=0;ch<2;ch++)hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buf.getChannelData(ch))),x=>x.toString(16).padStart(2,'0')).join(''));
 const pcm=[];for(let ch=0;ch<2;ch++){const bytes=new Uint8Array(buf.getChannelData(ch).buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));pcm.push(btoa(binary));}
 return {hashes,prepared,pcm,descriptor,export:r.state.audioExports.files[0]};
});}
try{
 const baseline=await page();
 for(const name of ['beat-beginner-bank','beat-production','beat-playback','beat-song-form']){
  const source=execFileSync('git',['show','148d5b35b1cb87e853dbe7976bab634241b7ce6f:src/'+name+'.js'],{encoding:'utf8',windowsHide:true});
  await baseline.route('**/src/'+name+'.js*',r=>r.fulfill({contentType:'text/javascript',body:source}));
 }
 const old=await legacyRender(baseline);
 if(process.argv.includes('--baseline-repeat-only')){
  const repeat=await legacyRender(baseline);let maxError=0,different=0;
  for(let ch=0;ch<2;ch++){const a=Buffer.from(old.pcm[ch],'base64'),b=Buffer.from(repeat.pcm[ch],'base64');for(let i=0;i<a.length/4;i++){const x=a.readFloatLE(i*4),y=b.readFloatLE(i*4);maxError=Math.max(maxError,Math.abs(x-y));if(x!==y)different++;}}
  delete old.pcm;delete repeat.pcm;assert.deepEqual(old.prepared,repeat.prepared);assert.deepEqual(old.descriptor,repeat.descriptor);assert.deepEqual(old.export,repeat.export);
  await writeFile(out+'/unchanged-base-repeat.json',JSON.stringify({base:'148d5b35b1cb87e853dbe7976bab634241b7ce6f',old,repeat,maxError,different},null,2)+'\n');
  console.log(JSON.stringify({unchangedBaseRepeat:true,maxError,different,old:old.hashes,repeat:repeat.hashes,preparedByteEquivalent:true}));
 }else{
 await baseline.close();
 const current=await page(),now=await legacyRender(current);
 let maximumError=0,differentFloats=0,differentPcm16=0;const pcm16Hashes=[];
 for(let ch=0;ch<2;ch++){const a=Buffer.from(old.pcm[ch],'base64'),b=Buffer.from(now.pcm[ch],'base64'),pcm16=Buffer.alloc(a.length/2);for(let i=0;i<a.length/4;i++){const x=a.readFloatLE(i*4),y=b.readFloatLE(i*4);maximumError=Math.max(maximumError,Math.abs(x-y));if(x!==y)differentFloats++;if(Math.round(x*32767)!==Math.round(y*32767))differentPcm16++;pcm16.writeInt16LE(Math.round(x*32767),i*2);}pcm16Hashes.push(createHash('sha256').update(pcm16).digest('hex'));}
 delete old.pcm;delete now.pcm;
 const legacyPcm={maximumError,differentFloats,differentPcm16,pcm16Hashes};console.log(JSON.stringify({legacyPcm}));
 await writeFile(out+'/legacy-comparison.json',JSON.stringify({old,now,legacyPcm},null,2));
 const differences=[];const compare=(a,b,path='')=>{if(typeof a!==typeof b||a===null||b===null||typeof a!=='object'){if(a!==b)differences.push({path,old:typeof a==='string'&&a.length>100?a.slice(0,100):a,now:typeof b==='string'&&b.length>100?b.slice(0,100):b});return;}for(const key of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[key],b[key],path+'.'+key);};compare(old,now);if(differences.length)console.log(JSON.stringify(differences));
 assert.deepEqual(now.prepared,old.prepared,'all processed legacy source PCM bytes match BASE');
 assert.deepEqual(now.descriptor,old.descriptor);assert.deepEqual(now.export,old.export);
 assert.ok(maximumError<=2e-7,'native final sum differs only at float rounding precision');await current.close();
 console.log('Legacy exported descriptor and prepared source PCM are byte-identical to BASE; final browser graph float variance measured.');
 const p=await page();p.setDefaultTimeout(120000);
 const result=await p.evaluate(async()=>{
  const [{USER_EXPERIMENTAL_BANK},{createBeat,startBeatStage,advanceBeatWork},{BeatAudio},{resolveBeatPlayback},{prepareBeatPcm},{createBeatPcmProcessor},{submissionFixture},{createAudioExport},{createVirtualPcState},{chooseSongForm}]=await Promise.all([
   import('/src/beat-beginner-bank.js'),import('/src/beat-production.js'),import('/src/beat-audio.js'),import('/src/beat-playback.js'),import('/src/beat-pcm-runtime.js'),import('/src/beat-pcm-background.js'),import('/test/helpers/submission-fixtures.js'),import('/src/pc-audio-exports.js'),import('/src/virtual-pc-state.js'),import('/src/beat-song-form.js')]);
  const check=(condition,message)=>{if(!condition)throw Error(message);},decoder=new OfflineAudioContext(2,470400,44100),loader=new BeatAudio(),buffers=new Map(),decoded=[],parity=[];loader.context=decoder;
  const fingerprint=async buffer=>{
   const hashes=[];let peak=0,power=0;for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(const x of data){check(Number.isFinite(x),'finite PCM');peak=Math.max(peak,Math.abs(x));power+=x*x;}hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join(''));}
   return {hashes,peak,rms:Math.sqrt(power/buffer.length/buffer.numberOfChannels),frames:buffer.length,rate:buffer.sampleRate,channels:buffer.numberOfChannels};
  };
  const worker=createBeatPcmProcessor();
  for(const part of USER_EXPERIMENTAL_BANK){
   const buffer=await loader.buffer(part.id);check(buffer.length===470400&&buffer.sampleRate===44100&&buffer.numberOfChannels===2,'native decode '+part.id);buffers.set(part.id,buffer);decoded.push({id:part.id,...await fingerprint(buffer)});
   const source={id:part.id,loopSeconds:32/3,sourceGainDb:-3.25,windows:[{startBar:0,bars:2,sourceBar:1},{startBar:2,bars:4,sourceBar:0},{startBar:6,bars:2,sourceBar:2}]};
   const sync=prepareBeatPcm(decoder,buffer,source,64/3),asyncBuffer=await worker.prepare(decoder,buffer,source,64/3),a=await fingerprint(sync),b=await fingerprint(asyncBuffer);check(JSON.stringify(a)===JSON.stringify(b),'worker parity '+part.id);parity.push(part.id);
  }
  worker.dispose();loader.pcm.dispose();
  const render=async descriptor=>{
   const c=new OfflineAudioContext(2,Math.ceil((descriptor.durationSeconds+.05)*44100),44100),a=new BeatAudio();a.unlock=async()=>{a.context=c;};a.cache=new Map(buffers);
   check(await a.playDescriptor(descriptor),a.error);const prepared=[];for(const s of a.sources)prepared.push((await fingerprint(s.buffer)).hashes);
   const result={...await fingerprint(await c.startRendering()),prepared};a.stop();a.pcm.dispose();return result;
  };
  const playback=[],renders=[],exports=[];
  const live=new BeatAudio({contextFactory:()=>new AudioContext({sampleRate:44100})});
  for(let variant=0;variant<14;variant++){
   let s=createBeat({projects:[]},{id:'native-'+variant,name:'Native '+variant},{beatmaking:100},()=>(variant+.5)/42).state;
   for(let stage=0;stage<3;stage++){s.music.needs={satiety:100,energy:100};s=advanceBeatWork(startBeatStage(s,'native-'+variant,[5,5,5],{beatmaking:100,sound:100}).state,1000).state;}
   const beat=s.projects[0],d=resolveBeatPlayback(beat).descriptor;
   check(await live.playProject(beat),live.error);check(live.context.state==='running'&&live.sources.length===3,'real native player');playback.push({variant,ids:d.parts.map(p=>p.id),status:live.status,voices:live.sources.length,context:live.context.state});live.stop();
   const rendered=await render(d);check(rendered.peak<.85&&rendered.rms>.0001,'mix headroom');renders.push({variant,...rendered});
   if([0,7,13].includes(variant)){
    let saved=submissionFixture({mixed:true}),b=saved.projects.find(p=>p.id==='beat');b.drumId=beat.drumId;b.audio={...beat.audio};b.songForm=chooseSongForm(b,{seed:variant});
    for(const kind of ['beat','vocal','track']){const r=createAudioExport(saved,{id:kind,projectId:'beat',kind,folderId:'exports',filename:kind+'.wav',nowMinute:600});check(r.ok,r.reason);saved=r.state;}
    const before=saved.audioExports.files,pcm=[];for(const f of before)pcm.push(await render(f.descriptor));
    saved.projects=[];saved.music.genres={version:1,xp:{experimental:75}};localStorage.setItem('task12-export-check',JSON.stringify(saved));
    const restored=createVirtualPcState(JSON.parse(localStorage.getItem('task12-export-check')));check(JSON.stringify(restored.audioExports.files)===JSON.stringify(before),'immutable restored exports');
    localStorage.setItem('task12-export-'+variant,JSON.stringify(saved));
    for(let i=0;i<before.length;i++){const again=await render(restored.audioExports.files[i].descriptor);check(JSON.stringify(again.prepared)===JSON.stringify(pcm[i].prepared),'export source PCM bytes after restore');check(Math.abs(again.peak-pcm[i].peak)<2e-7&&Math.abs(again.rms-pcm[i].rms)<2e-7,'export graph rounding tolerance');exports.push({variant,kind:before[i].kind,...again});}
   }
  }
  live.dispose();return {decoded,workerParity:parity,playback,renders,exports,subjectiveListening:false};
 });
 await p.reload();
 const reload=await p.evaluate(async expected=>{
  const [{createVirtualPcState},{BeatAudio}]=await Promise.all([import('/src/virtual-pc-state.js'),import('/src/beat-audio.js')]);const checks=[];
  const audio=new BeatAudio({contextFactory:()=>new AudioContext({sampleRate:44100})});
  for(const row of expected){const saved=createVirtualPcState(JSON.parse(localStorage.getItem('task12-export-'+row.variant))),file=saved.audioExports.files.find(f=>f.kind===row.kind);
   if(!await audio.playDescriptor(file.descriptor))throw Error(audio.error);const hashes=[];for(const source of audio.sources){const channels=[];for(let ch=0;ch<source.buffer.numberOfChannels;ch++)channels.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',source.buffer.getChannelData(ch))),x=>x.toString(16).padStart(2,'0')).join(''));hashes.push(channels);}
   if(JSON.stringify(hashes)!==JSON.stringify(row.prepared))throw Error('actual browser reload PCM changed');checks.push({variant:row.variant,kind:row.kind,prepared:hashes});audio.stop();
  }audio.dispose();return checks;
 },result.exports);
 assert.equal(result.decoded.length,28);assert.equal(result.workerParity.length,28);assert.equal(result.playback.length,14);assert.equal(result.exports.length,9);assert.equal(reload.length,9);assert.deepEqual(errors,[]);
 await writeFile(out+'/evidence.json',JSON.stringify({passed:true,base:'148d5b35b1cb87e853dbe7976bab634241b7ce6f',legacy:old,legacyPcm,...result,reload,errors},null,2)+'\n');
 console.log(JSON.stringify({passed:true,decoded:28,workerParity:28,recipes:14,immutableExports:9,browserReload:9,maxMixPeak:Math.max(...result.renders.map(r=>r.peak)),minMixRms:Math.min(...result.renders.map(r=>r.rms)),legacyMaximumGraphError:maximumError,legacyPreparedPcmByteEquivalent:true,subjectiveListening:false}));
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
