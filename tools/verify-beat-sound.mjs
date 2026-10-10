// Real Web Audio acceptance checks and original-audio comparisons; isolated storage.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/beat-sound-20261010';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__sound-check',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Audio verification</title>'}));
 await page.goto('http://127.0.0.1:4173/__sound-check');
 const measured=await page.evaluate(async()=>{
  const mod=await import('/src/beat-mix.js?rev=26');
  if(typeof mod.connectBeatMix!=='function')throw Error('Missing production mix graph');
  const render=async(profile,frequency)=>{
   const c=new OfflineAudioContext(1,44100,44100),b=c.createBuffer(1,44100,44100),data=b.getChannelData(0);
   for(let i=0;i<data.length;i++)data[i]=.2*Math.sin(2*Math.PI*frequency*i/44100);
   const source=c.createBufferSource();source.buffer=b;const fx=mod.connectBeatMix(c,profile,c.destination);source.connect(fx.input);source.start();
   const result=(await c.startRendering()).getChannelData(0);fx.dispose();
   const rms=Math.sqrt(result.slice(4000).reduce((s,n)=>s+n*n,0)/(result.length-4000));
   return {rms,finite:result.every(Number.isFinite),peak:Math.max(...result)};
  };
  const p=(skill,character)=>({version:1,skill,character}),values={};
  for(const [name,profile,freq]of [['clean',null,100],['good',p(90,'thin'),100],['thin',p(10,'thin'),100],['improved',p(60,'thin'),100],['bright',null,7000],['muffled',p(10,'muffled'),7000],['crushed',p(10,'crushed'),1200]])values[name]=await render(profile,freq);
  return values;
 });
 assert.ok(Object.values(measured).every(v=>v.finite&&v.peak<=1));
 assert.ok(Math.abs(measured.clean.rms-measured.good.rms)<1e-6,'high sound skill must bypass deliberate degradation');
 assert.ok(measured.thin.rms<measured.clean.rms*.35,'thin mix attenuates bass');
 assert.ok(measured.improved.rms>measured.thin.rms*2,'skill reduces the defect');
 assert.ok(measured.improved.rms<=measured.clean.rms*1.01,'corrective filters must not add resonant loudness');
 assert.ok(measured.muffled.rms<measured.bright.rms*.4,'muffled mix attenuates highs');
 assert.ok(measured.crushed.rms>.01,'digital effect does not silence the signal');
 console.log('PASS real OfflineAudioContext spectrum / clean bypass / bounded output',JSON.stringify(measured));
 const playback=await page.evaluate(async()=>{
  const [{BeatAudio},{createBeat},{createVirtualPcState}]=await Promise.all([import('/src/beat-audio.js?rev=26'),import('/src/beat-production.js?rev=26'),import('/src/virtual-pc-state.js?rev=26')]);
  const beat=createBeat(createVirtualPcState(),{id:'proof',name:'Проверка'},{sound:10},()=>.2).state.projects[0];beat.stages=[{sliders:[5,5,5],fit:0,quality:10}];
  const audio=new BeatAudio();const ok=await audio.playProject(beat);const initial=audio.effects;
  const connected=audio.sources.length===1&&initial?.input!==audio.context.destination;
  await new Promise(r=>setTimeout(r,120));audio.pause();const paused=audio.getSnapshot().positionSeconds;
  await audio.playProject(beat);const resumed=audio.getSnapshot().positionSeconds;
  audio.stop({fadeSeconds:.04});await new Promise(r=>setTimeout(r,100));
  const retired=audio.retiring.length,stopped=audio.getSnapshot().status;audio.dispose();
  return {ok,connected,paused,resumed,retired,stopped};
 });
 assert.equal(playback.ok,true);assert.equal(playback.connected,true);assert.ok(playback.paused>0);assert.ok(Math.abs(playback.paused-playback.resumed)<.03);assert.equal(playback.retired,0);assert.equal(playback.stopped,'stopped');
 console.log('PASS real player graph / pause-resume / fading cleanup',JSON.stringify(playback));
 // One identical original beat through different saved mixes, not different compositions.
 const renders=await page.evaluate(async()=>{
  const [{connectBeatMix},{beginnerById}]=await Promise.all([import('/src/beat-mix.js?rev=26'),import('/src/beat-beginner-bank.js?rev=21')]);
  const rate=44100,length=Math.round(32/3*rate),parts=['beginner-drums-04','beginner-theme-06','beginner-arrangement-02'];
  const decoder=new OfflineAudioContext(1,length,rate),buffers=await Promise.all(parts.map(async id=>decoder.decodeAudioData(await (await fetch(beginnerById(id).path)).arrayBuffer())));
  const result={};
  for(const character of ['clean','thin','muffled','crushed']){
   const c=new OfflineAudioContext(2,length,rate),gain=c.createGain();gain.gain.value=.7;
   const fx=connectBeatMix(c,character==='clean'?null:{version:1,skill:10,character},c.destination);gain.connect(fx.input);
   for(const buffer of buffers){const source=c.createBufferSource();source.buffer=buffer;source.connect(gain);source.start();}
   const rendered=await c.startRendering(),bytes=new Uint8Array(44+length*4),v=new DataView(bytes.buffer);
   const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
   str(0,'RIFF');v.setUint32(4,bytes.length-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint32(28,rate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,length*4,true);
   const channels=[rendered.getChannelData(0),rendered.getChannelData(1)];
   for(let i=0;i<length;i++)for(let ch=0;ch<2;ch++){
    const fade=Math.min(1,i/220,(length-1-i)/880),sample=Math.max(-1,Math.min(1,channels[ch][i]*fade));v.setInt16(44+i*4+ch*2,Math.round(sample*32767),true);
   }
   let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));result[character]=btoa(binary);fx.dispose();
  }
  return result;
 });
 for(const [name,base64]of Object.entries(renders))await writeFile(output+'/'+name+'.wav',Buffer.from(base64,'base64'));
 // Two bars per character, separated by silence. Keep all originals as individual files.
 const frames=Math.round(16/3*44100),segments=[];
 for(const base64 of Object.values(renders)){
  const data=Buffer.from(base64,'base64').subarray(44,44+frames*4);
  for(let i=0;i<frames;i++)for(let ch=0;ch<2;ch++){
   const at=i*4+ch*2,fade=Math.min(1,i/441,(frames-1-i)/441);data.writeInt16LE(Math.round(data.readInt16LE(at)*fade),at);
  }
  if(segments.length)segments.push(Buffer.alloc(Math.round(.4*44100)*4));segments.push(data);
 }
 const body=Buffer.concat(segments),header=Buffer.from(renders.clean,'base64').subarray(0,44);
 header.writeUInt32LE(body.length+36,4);header.writeUInt32LE(body.length,40);
 await writeFile(output+'/comparison.wav',Buffer.concat([header,body]));
 assert.deepEqual(errors,[]);console.log('PASS four WAV comparisons saved to '+output);
}finally{await browser.close();}
