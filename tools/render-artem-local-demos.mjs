// Owned isolated HTTP server + fresh Edge context. Never touches campaign storage.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generateDemoFixture} from './audio/npc-demo-fixture.mjs';
import {beginnerById} from '../src/beat-beginner-bank.js';
import {npcVocalById} from '../src/npc-vocal-catalog.js';
const root=fileURLToPath(new URL('../',import.meta.url)),output=resolve(root,'artifacts/artem-local-demos');
const verifyOnly=process.argv.includes('--verify-only');
process.env.TEMP='D:/Codex/Temp';process.env.TMP='D:/Codex/Temp';
const {chromium}=createRequire(import.meta.url)('D:/Project/Battle-web/node_modules/playwright');
await mkdir(output,{recursive:true});
const examples=[];
for(const [demoSeed,label] of [[3,'artem-beatmaking-48-seed-3'],[33,'artem-beatmaking-48-seed-33']]){
 const fixture=await generateDemoFixture({demoSeed}),saved=fixture.version;
 assert.equal(saved.npc.voiceId,'npc-voice:artem-20261018');assert.ok(saved.npc.skills.beatmaking>=46&&saved.npc.skills.beatmaking<50);assert.ok(saved.recipe.descriptor.parts.some(p=>/jura-experimental-20261018-.*-[34]$/.test(p.id)));
 if(verifyOnly){const prior=JSON.parse(await readFile(resolve(output,label+'-saved-state.json'),'utf8'));assert.deepEqual(saved,prior.trackVersions.byId[saved.id],'frozen recipe and assignment equality');}else await writeFile(resolve(output,label+'-saved-state.json'),JSON.stringify(fixture.state,null,2));
 const {state:ignored,...metadata}=fixture;examples.push({...metadata,label,sourceParts:saved.recipe.descriptor.parts.filter(p=>!p.vocal).map(p=>beginnerById(p.id))});
}
assert.notEqual(examples[0].version.recipe.descriptor.parts.at(-1).id,examples[1].version.recipe.descriptor.parts.at(-1).id);
assert.notDeepEqual(examples[0].sourceParts.map(p=>p.id),examples[1].sourceParts.map(p=>p.id));
const mime={'.js':'text/javascript','.json':'application/json','.wav':'audio/wav','.html':'text/html'};
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/__artem-demo'){res.setHeader('content-type','text/html');res.end('<!doctype html><title>Local Artem verification</title>');return;}
 const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root.endsWith(sep)?root:root+sep)||!(await stat(path)).isFile()){res.writeHead(404).end();return;}
 res.setHeader('content-type',mime[extname(path)]??'application/octet-stream');res.end(await readFile(path));
 }catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin+'/__artem-demo');
 const evidence=[];
 for(const example of examples){
  const result=await page.evaluate(async version=>{
   const [{BeatAudio},{playTrackVersion},{connectBeatResult,connectBeatResultMaster},{descriptorOutputGain}]=await Promise.all([import('/src/beat-audio.js?rev=47'),import('/src/track-version-audio.js?rev=47'),import('/src/beat-result-dsp.js?rev=43'),import('/src/audio-levels.js?rev=43')]);
   let workers=0;const workerJobs=[],workerResults=[],RealWorker=globalThis.Worker;globalThis.Worker=class extends RealWorker{
    constructor(...a){super(...a);workers++;this.addEventListener('message',({data})=>workerResults.push({id:data.id,error:data.error??null,frames:data.channels?.[0]?.length??0}));}
    postMessage(data,transfer){workerJobs.push({id:data.id,partId:data.part.id,vocal:Boolean(data.part.vocal),vocalSeed:data.part.vocal?.seed??null,sourceGainDb:data.part.sourceGainDb});return super.postMessage(data,transfer);}
   };
   const audio=new BeatAudio(),played=await playTrackVersion(audio,version);if(!played.ok)throw Error(played.reason);
   const descriptor=version.recipe.descriptor,buffers=audio.sources.map(s=>s.buffer),snapshot=audio.getSnapshot(),vocalIndex=descriptor.parts.findIndex(p=>p.vocal),rawVocal=audio.cache.get(descriptor.parts[vocalIndex].id),processedVocal=buffers[vocalIndex];
   let changedVocalSamples=0;for(let i=0;i<Math.min(rawVocal.length,processedVocal.length);i++)if(rawVocal.getChannelData(0)[i]!==processedVocal.getChannelData(0)[i])changedVocalSamples++;
   const vocalProcessing={rawFrames:rawVocal.length,processedFrames:processedVocal.length,changedVocalSamples};audio.stop();
   const rate=44100,frames=Math.round(descriptor.durationSeconds*rate),c=new OfflineAudioContext(2,frames,rate),master=connectBeatResultMaster(c,c.destination),gain=c.createGain();gain.gain.value=descriptorOutputGain(descriptor);gain.connect(master.input);
   const stats=channels=>{let peak=0,power=0,clipped=0,edgePeak=0;for(const channel of channels)for(let i=0;i<channel.length;i++){const x=channel[i];if(!Number.isFinite(x))throw Error('Nonfinite audio');peak=Math.max(peak,Math.abs(x));power+=x*x;if(Math.abs(x)>=1)clipped++;if(i<132||i>channel.length-133)edgePeak=Math.max(edgePeak,Math.abs(x));}return {peak,rms:Math.sqrt(power/(channels.length*channels[0].length)),clipped,edgePeak};};
   const layerStats=buffers.map((b,i)=>({id:descriptor.parts[i].id,vocal:Boolean(descriptor.parts[i].vocal),...stats(Array.from({length:b.numberOfChannels},(_,ch)=>b.getChannelData(ch)))})),effects=[];
   for(const [i,b]of buffers.entries()){const source=c.createBufferSource();source.buffer=b;source.loop=true;source.loopEnd=descriptor.parts[i].windows?descriptor.durationSeconds:descriptor.parts[i].loopSeconds;let input=gain;if(descriptor.parts[i].result){const fx=connectBeatResult(c,descriptor.parts[i].result,gain);effects.push(fx);input=fx.input;}source.connect(input);source.start();source.stop(descriptor.durationSeconds);}
   const rendered=await c.startRendering(),channels=Array.from({length:2},(_,ch)=>rendered.getChannelData(ch)),metrics=stats(channels),bytes=new Uint8Array(44+frames*4),view=new DataView(bytes.buffer),str=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
   str(0,'RIFF');view.setUint32(4,bytes.length-8,true);str(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,frames*4,true);
   for(let i=0;i<frames;i++)for(let ch=0;ch<2;ch++)view.setInt16(44+i*4+ch*2,Math.round(Math.max(-1,Math.min(1,channels[ch][i]))*32767),true);
   let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
   audio.dispose();effects.forEach(fx=>fx.dispose());master.dispose();globalThis.Worker=RealWorker;
   return {wav:btoa(binary),metrics,layerStats,workers,workerJobs,workerResults,vocalProcessing,snapshot,frames,sampleRate:rate,durationSeconds:descriptor.durationSeconds};
  },example.version);
  assert.equal(result.snapshot.status,'playing');assert.ok(result.workers>=1);assert.equal(result.metrics.clipped,0);assert.ok(result.metrics.rms>.0001);const vocal=result.layerStats.find(p=>p.vocal);assert.ok(vocal?.rms>.0001&&vocal.peak>0);assert.equal(vocal.clipped,0);
  const vocalJob=result.workerJobs.find(j=>j.vocal);assert.ok(vocalJob);assert.ok(result.workerResults.some(j=>j.id===vocalJob.id&&!j.error&&j.frames>0));assert.ok(result.vocalProcessing.changedVocalSamples>1000);
  const wav=Buffer.from(result.wav,'base64');let comparison=null;
  if(verifyOnly){const prior=await readFile(resolve(output,example.label+'.wav'));assert.equal(wav.length,prior.length);assert.deepEqual(wav.subarray(0,44),prior.subarray(0,44));let maxPcm16Delta=0,changedSamples=0;for(let i=44;i<wav.length;i+=2){const d=Math.abs(wav.readInt16LE(i)-prior.readInt16LE(i));maxPcm16Delta=Math.max(maxPcm16Delta,d);if(d)changedSamples++;}comparison={maxPcm16Delta,changedSamples};assert.ok(maxPcm16Delta<=2,'browser filter float rounding stays within two PCM16 units');}else await writeFile(resolve(output,example.label+'.wav'),wav);
  const {wav:ignored,...metrics}=result,voice=example.version.recipe.descriptor.parts.find(p=>p.vocal),metadata={...example,...metrics,sourceAcapella:npcVocalById(voice.id),sourceBeatIds:example.version.recipe.descriptor.parts.filter(p=>!p.vocal).map(p=>p.id),sha256:createHash('sha256').update(wav).digest('hex'),processing:'Decoded by real browser; BeatAudio+module worker PCM, then same source buffers and existing effects rendered with OfflineAudioContext. No cosmetic export fades, normalization or remixing.'};
  if(!verifyOnly)await writeFile(resolve(output,example.label+'.json'),JSON.stringify(metadata,null,2));evidence.push(metadata);console.log(JSON.stringify({label:example.label,verifyOnly,comparison,metrics:result.metrics,workers:result.workers,path:resolve(output,example.label+'.wav')}));
 }
 assert.deepEqual(errors,[]);if(!verifyOnly)await writeFile(resolve(output,'evidence.json'),JSON.stringify({origin,isolatedContext:true,playerStorageTouched:false,examples:evidence},null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
