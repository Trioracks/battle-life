// Isolated Web Audio acceptance checks. Never reads or writes player storage.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/beat-result-20261010';await mkdir(output,{recursive:true});
const scratch=process.env.BATTLE_QA_TEMP||'D:/Codex/Temp';await mkdir(scratch,{recursive:true});process.env.TEMP=scratch;process.env.TMP=scratch;
process.env.PLAYWRIGHT_BROWSERS_PATH??='D:/Codex/Caches/ms-playwright';
const assets=['drums/04','theme/06','arrangement/02'].map(p=>new URL('../assets/audio/ft/beginner-v1/'+p+'.wav',import.meta.url));
const hashes=async()=>Promise.all(assets.map(async p=>createHash('sha256').update(await readFile(p)).digest('hex'))),before=await hashes();
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__result-check',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Saved result audio verification</title>'}));
 await page.goto((process.env.BATTLE_URL||'http://127.0.0.1:4173')+'/__result-check');
 const result=await page.evaluate(async()=>{
  const [{transformBeatBuffer,connectBeatResult,connectBeatResultMaster},{BeatAudio},{createBeat,startBeatStage,advanceBeatWork},{createVirtualPcState}]=await Promise.all([import('/src/beat-result-dsp.js?rev=32'),import('/src/beat-audio.js?rev=32'),import('/src/beat-production.js?rev=32'),import('/src/virtual-pc-state.js?rev=32')]);
  const rate=44100,length=470400,decoder=new OfflineAudioContext(2,length,rate),ids=['drums/04','theme/06','arrangement/02'];
  const buffers=await Promise.all(ids.map(async p=>decoder.decodeAudioData(await(await fetch('/assets/audio/ft/beginner-v1/'+p+'.wav')).arrayBuffer())));
  const original=buffers.map(b=>b.getChannelData(0).slice()),rms=a=>Math.sqrt(a.reduce((s,n)=>s+n*n,0)/a.length),peak=a=>a.reduce((s,n)=>Math.max(s,Math.abs(n)),0);
  // This sweep represents growing skill, not an impossible quality100/skill10 novice.
  // Separate unit tests cover lucky decisions and the saved-skill effect gate.
  const profile=(quality,stage)=>({stage,seed:135,skills:{beatmaking:Math.min(100,quality),sound:Math.min(100,quality)},sliders:[5,5,5],fit:50,quality});
  const render=async(quality,drumsOnly=false)=>{
   const c=new OfflineAudioContext(2,length,rate),master=c.createGain(),end=connectBeatResultMaster(c,c.destination),graphs=[];master.gain.value=.7;master.connect(end.input);
   for(let stage=0;stage<(drumsOnly?1:3);stage++){
    const r=profile(quality,stage),buffer=transformBeatBuffer(c,buffers[stage],r,32/3),fx=connectBeatResult(c,r,master),source=c.createBufferSource();
    source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=32/3;source.connect(fx.input);source.start(0);source.stop(32/3);graphs.push(fx);
   }
   const b=await c.startRendering();graphs.forEach(g=>g.dispose());end.dispose();master.disconnect();return [b.getChannelData(0).slice(),b.getChannelData(1).slice()];
  };
  const wav=channels=>{
   const bytes=new Uint8Array(44+length*4),v=new DataView(bytes.buffer),str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
   str(0,'RIFF');v.setUint32(4,bytes.length-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint32(28,rate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,length*4,true);
   for(let i=0;i<length;i++)for(let ch=0;ch<2;ch++){const fade=Math.min(1,i/220,(length-1-i)/880);v.setInt16(44+i*4+ch*2,Math.round(channels[ch][i]*fade*32767),true);}
   let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s);
  };
  const dry=await render(100),metrics={},files={};
  for(const quality of [0,5,10,30,90,99,100,110]){
   const channels=quality===100?dry:await render(quality),difference=rms(channels[0].map((v,i)=>v-dry[0][i]));
   metrics[quality]={length:channels[0].length,duration:channels[0].length/rate,finite:channels.every(c=>c.every(Number.isFinite)),peak:Math.max(...channels.map(peak)),rms:rms(channels[0]),difference};files['result-'+quality+'.wav']=wav(channels);
  }
  const drumsDry=await render(100,true),drumsBad=await render(10,true);
  metrics.drums={difference:rms(drumsBad[0].map((v,i)=>v-drumsDry[0][i])),dryRms:rms(drumsDry[0]),badRms:rms(drumsBad[0])};files['drums-10.wav']=wav(drumsBad);files['drums-100.wav']=wav(drumsDry);
  const dryExpected=original[0].map((_,i)=>.7*(original[0][i]+original[1][i]+original[2][i]));
  metrics.dryError=rms(dry[0].map((v,i)=>v-dryExpected[i]));metrics.originalBuffersUnchanged=original.every((a,n)=>a.every((v,i)=>v===buffers[n].getChannelData(0)[i]));
  let state=createBeat(createVirtualPcState(),{id:'native-result',name:'Проверка'},{beatmaking:10,sound:10},()=>.2).state;
  state=startBeatStage(state,'native-result',[0,10,10],{beatmaking:10,sound:10}).state;
  const tracked=[];
  const trackContext=(failShape=0)=>{
   const context=new AudioContext();let shapes=0;
   for(const method of ['createGain','createBiquadFilter','createWaveShaper','createDelay','createBufferSource']){
    const create=context[method].bind(context);context[method]=(...args)=>{
     if(method==='createWaveShaper'&&++shapes===failShape)throw Error('Simulated graph allocation failure');
     const node=create(...args),entry={node,released:false},disconnect=node.disconnect.bind(node);tracked.push(entry);
     node.disconnect=(...args)=>{entry.released=true;return disconnect(...args);};return node;
    };
   }return context;
  };
  const audio=new BeatAudio({contextFactory:()=>trackContext()}),beat=state.projects[0];const ok=await audio.playProject(beat,{workStage:0}),firstBuffer=audio.sources[0]?.buffer;
  const transformed=ok&&firstBuffer!==audio.cache.get(beat.drumId),duration=firstBuffer?.duration;
  await new Promise(r=>setTimeout(r,130));audio.pause();const paused=audio.getSnapshot().positionSeconds;
  await audio.playProject(beat,{workStage:0});const resumed=audio.getSnapshot().positionSeconds;
  const reused=audio.sources[0]?.buffer===firstBuffer;
  audio.stop({fadeSeconds:.04});await new Promise(r=>setTimeout(r,100));const retired=audio.retiring.length;
  const done=advanceBeatWork(state,600).state.projects[0];await audio.playProject(done);
  const sameCompleted=audio.sources[0]?.buffer===firstBuffer;audio.stop();const stopped=audio.sources.length===0;audio.dispose();
  const nodesReleased=tracked.every(n=>n.released);
  const failureAudio=new BeatAudio({contextFactory:()=>trackContext(3)}),broken=structuredClone(done);
  broken.stages=[{},{},{}];broken.mix.layers=[0,1,2].map(stage=>profile(10,stage));
  const refused=!(await failureAudio.playProject(broken)),failureStatus=failureAudio.getSnapshot().status;failureAudio.dispose();
  metrics.player={ok,transformed,duration,paused,resumed,reused,retired,sameCompleted,stopped,nodesReleased,failedGraphReleased:refused&&failureStatus==='error'&&tracked.every(n=>n.released)};
  return {metrics,files};
 });
 const m=result.metrics;
 console.log('DSP diagnostics '+JSON.stringify(m));
 for(const q of [0,5,10,30,90,99,100,110]){assert.equal(m[q].length,470400);assert.ok(m[q].finite);assert.ok(m[q].peak<.981);assert.ok(m[q].rms>.01);}
 assert.ok(m[99].difference<m[90].difference*.25,'near 100 approaches dry: '+JSON.stringify({q99:m[99].difference,q90:m[90].difference}));
 assert.ok(m[10].difference>m[90].difference);assert.ok(m[30].difference>m[90].difference);assert.ok(m[110].difference<m[30].difference*.2,'creative bonus is small');assert.ok(m[110].difference>0,'110 is audible');
 assert.ok(m.drums.difference>m.drums.dryRms*.4,'the very first layer must be damaged');assert.ok(m.dryError<1e-6,'100 is dry');assert.equal(m.originalBuffersUnchanged,true);
 assert.equal(m.player.ok,true);assert.equal(m.player.transformed,true);assert.equal(m.player.duration,32/3);assert.ok(m.player.paused>0);assert.ok(Math.abs(m.player.paused-m.player.resumed)<.03);assert.equal(m.player.reused,true);assert.equal(m.player.retired,0);assert.equal(m.player.sameCompleted,true);assert.equal(m.player.stopped,true);assert.equal(m.player.nodesReleased,true);assert.equal(m.player.failedGraphReleased,true);
 assert.deepEqual(await hashes(),before);assert.deepEqual(errors,[]);
 for(const [name,base64]of Object.entries(result.files))await writeFile(output+'/'+name,Buffer.from(base64,'base64'));
 await writeFile(output+'/metrics.json',JSON.stringify(m,null,2));console.log(JSON.stringify({output,originalFilesUnchanged:true,...m}));
}finally{await browser.close();}
