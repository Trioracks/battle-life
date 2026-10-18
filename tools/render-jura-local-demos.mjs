// Owned isolated HTTP server + fresh Edge context. Never touches campaign storage.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ensureNpcRoundTrack} from '../src/battle-npc.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createVocalTake} from '../src/vocal-result.js';
import {npcVocalById} from '../src/npc-vocal-catalog.js';
const root=fileURLToPath(new URL('../',import.meta.url)),output=resolve(root,'artifacts/jura-local-demos');
const verifyOnly=process.argv.includes('--verify-only');
process.env.TEMP='D:/Codex/Temp';process.env.TMP='D:/Codex/Temp';
const {chromium}=createRequire(import.meta.url)('D:/Project/Battle-web/node_modules/playwright');
await mkdir(output,{recursive:true});
const examples=[];
for(const [characterId,label] of [['mak-npc-08','rough-sound-8'],['mak-npc-12','higher-sound-34']]){
 const args={characterId,battleId:'makarevich-1',roundId:'selection',nowMinute:600},result=ensureNpcRoundTrack(createVirtualPcState(),args);assert.equal(result.ok,true,result.reason);
 const saved=result.state.trackVersions.byId[result.trackVersionId],reloaded=createVirtualPcState(JSON.parse(JSON.stringify(result.state))),again=ensureNpcRoundTrack(reloaded,args);
 assert.deepEqual(again.state.trackVersions.byId[result.trackVersionId],saved);assert.deepEqual(again.state.npcTracks.voices,result.state.npcTracks.voices);
 if(verifyOnly){const prior=JSON.parse(await readFile(resolve(output,label+'-saved-state.json'),'utf8'));assert.deepEqual(saved,prior.trackVersions.byId[saved.id],'frozen recipe and assignment equality');}else await writeFile(resolve(output,label+'-saved-state.json'),JSON.stringify(result.state,null,2));examples.push({label,kind:'Generated local example using canonical NPC; not an actual campaign event',version:saved,reloadEqual:true});
}
const controlled=structuredClone(examples[1]),v=controlled.version,take=createVocalTake({...v.recipe.npcTake,skills:{...v.npc.skills,sound:50}});
controlled.label='controlled-sound-50-master';controlled.kind='Controlled same-performance processing comparison: canonical NPC voice and beat; sound/mix/master set to50 in this harness only. Not a canonical NPC event.';
v.id+=':controlled-sound50';v.npc.skills.sound=50;v.recipe.npcTake=take;v.recipe.npcRecording={draft:take,mix:{skill:50,gain:2},master:{skill:50,gain:2}};
v.recipe.descriptor.parts.find(p=>p.vocal).vocal={...v.recipe.descriptor.parts.find(p=>p.vocal).vocal,...take,quality:Math.min(take.ceiling,take.quality+4),postGain:4,vocalGainDb:.5};
v.recipe.descriptor.outputGain=.55*10**(4/20);examples.push(controlled);
const mime={'.js':'text/javascript','.json':'application/json','.wav':'audio/wav','.html':'text/html'};
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/__jura-demo'){res.setHeader('content-type','text/html');res.end('<!doctype html><title>Local Jura verification</title>');return;}
 const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root.endsWith(sep)?root:root+sep)||!(await stat(path)).isFile()){res.writeHead(404).end();return;}
 res.setHeader('content-type',mime[extname(path)]??'application/octet-stream');res.end(await readFile(path));
 }catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin+'/__jura-demo');
 const evidence=[];
 for(const example of examples){
  const result=await page.evaluate(async version=>{
   const [{BeatAudio},{playTrackVersion},{connectBeatResult,connectBeatResultMaster},{descriptorOutputGain}]=await Promise.all([import('/src/beat-audio.js?rev=43'),import('/src/track-version-audio.js?rev=43'),import('/src/beat-result-dsp.js?rev=43'),import('/src/audio-levels.js?rev=43')]);
   let workers=0;const RealWorker=globalThis.Worker;globalThis.Worker=class extends RealWorker{constructor(...a){super(...a);workers++;}};
   const audio=new BeatAudio(),played=await playTrackVersion(audio,version);if(!played.ok)throw Error(played.reason);
   const descriptor=version.recipe.descriptor,buffers=audio.sources.map(s=>s.buffer),snapshot=audio.getSnapshot();audio.stop();
   const rate=44100,frames=Math.round(descriptor.durationSeconds*rate),c=new OfflineAudioContext(2,frames,rate),master=connectBeatResultMaster(c,c.destination),gain=c.createGain();gain.gain.value=descriptorOutputGain(descriptor);gain.connect(master.input);
   const stats=channels=>{let peak=0,power=0,clipped=0,edgePeak=0;for(const channel of channels)for(let i=0;i<channel.length;i++){const x=channel[i];if(!Number.isFinite(x))throw Error('Nonfinite audio');peak=Math.max(peak,Math.abs(x));power+=x*x;if(Math.abs(x)>=1)clipped++;if(i<132||i>channel.length-133)edgePeak=Math.max(edgePeak,Math.abs(x));}return {peak,rms:Math.sqrt(power/(channels.length*channels[0].length)),clipped,edgePeak};};
   const layerStats=buffers.map((b,i)=>({id:descriptor.parts[i].id,vocal:Boolean(descriptor.parts[i].vocal),...stats(Array.from({length:b.numberOfChannels},(_,ch)=>b.getChannelData(ch)))})),effects=[];
   for(const [i,b]of buffers.entries()){const source=c.createBufferSource();source.buffer=b;source.loop=true;source.loopEnd=descriptor.parts[i].windows?descriptor.durationSeconds:descriptor.parts[i].loopSeconds;let input=gain;if(descriptor.parts[i].result){const fx=connectBeatResult(c,descriptor.parts[i].result,gain);effects.push(fx);input=fx.input;}source.connect(input);source.start();source.stop(descriptor.durationSeconds);}
   const rendered=await c.startRendering(),channels=Array.from({length:2},(_,ch)=>rendered.getChannelData(ch)),metrics=stats(channels),bytes=new Uint8Array(44+frames*4),view=new DataView(bytes.buffer),str=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
   str(0,'RIFF');view.setUint32(4,bytes.length-8,true);str(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,frames*4,true);
   for(let i=0;i<frames;i++)for(let ch=0;ch<2;ch++)view.setInt16(44+i*4+ch*2,Math.round(Math.max(-1,Math.min(1,channels[ch][i]))*32767),true);
   let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
   audio.dispose();effects.forEach(fx=>fx.dispose());master.dispose();globalThis.Worker=RealWorker;
   return {wav:btoa(binary),metrics,layerStats,workers,snapshot,frames,sampleRate:rate,durationSeconds:descriptor.durationSeconds};
  },example.version);
  assert.equal(result.snapshot.status,'playing');assert.ok(result.workers>=1);assert.equal(result.metrics.clipped,0);assert.ok(result.metrics.rms>.0001);
  const wav=Buffer.from(result.wav,'base64');let comparison=null;
  if(verifyOnly){const prior=await readFile(resolve(output,example.label+'.wav'));assert.equal(wav.length,prior.length);assert.deepEqual(wav.subarray(0,44),prior.subarray(0,44));let maxPcm16Delta=0,changedSamples=0;for(let i=44;i<wav.length;i+=2){const d=Math.abs(wav.readInt16LE(i)-prior.readInt16LE(i));maxPcm16Delta=Math.max(maxPcm16Delta,d);if(d)changedSamples++;}comparison={maxPcm16Delta,changedSamples};assert.ok(maxPcm16Delta<=2,'browser filter float rounding stays within two PCM16 units');}else await writeFile(resolve(output,example.label+'.wav'),wav);
  const {wav:ignored,...metrics}=result,voice=example.version.recipe.descriptor.parts.find(p=>p.vocal),metadata={...example,...metrics,sourceAcapella:npcVocalById(voice.id),sourceBeatIds:example.version.recipe.descriptor.parts.filter(p=>!p.vocal).map(p=>p.id),sha256:createHash('sha256').update(wav).digest('hex'),processing:'Decoded by real browser; BeatAudio+module worker PCM, then same source buffers and existing effects rendered with OfflineAudioContext. No cosmetic export fades, normalization or remixing.'};
  if(!verifyOnly)await writeFile(resolve(output,example.label+'.json'),JSON.stringify(metadata,null,2));evidence.push(metadata);console.log(JSON.stringify({label:example.label,verifyOnly,comparison,metrics:result.metrics,workers:result.workers,path:resolve(output,example.label+'.wav')}));
 }
 assert.deepEqual(errors,[]);if(!verifyOnly)await writeFile(resolve(output,'evidence.json'),JSON.stringify({origin,isolatedContext:true,playerStorageTouched:false,examples:evidence},null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
