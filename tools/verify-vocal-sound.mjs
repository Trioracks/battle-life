import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core');
const output='D:/Codex/Builds/Battle/vocal-recording';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage();await page.route('**/__vocal-sound',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Vocal audio verification</title>'}));await page.goto('http://127.0.0.1:4173/__vocal-sound');
 const result=await page.evaluate(async()=>{
  const [{VOCALS},{createVocalTake,vocalPlaybackProfile},{transformVocalBuffer},{transformBeatBuffer,connectBeatResult,connectBeatResultMaster},{createBeatResult},{BeatAudio}]=await Promise.all([import('/src/vocal-catalog.js?rev=28'),import('/src/vocal-result.js?rev=28'),import('/src/vocal-result-dsp.js?rev=28'),import('/src/beat-result-dsp.js?rev=28'),import('/src/beat-result.js?rev=28'),import('/src/beat-audio.js?rev=28')]);
  const rate=44100,frames=470400,decoder=new OfflineAudioContext(2,frames,rate),cache=new Map();
  const decode=async path=>{if(!cache.has(path)){const response=await fetch(path);if(!response.ok)throw Error(path);cache.set(path,await decoder.decodeAudioData(await response.arrayBuffer()));}return cache.get(path);};
  for(const v of VOCALS){const b=await decode(v.path);if(b.length!==frames||b.numberOfChannels!==2)throw Error('bad vocal '+v.id);}
  const voice=await decode(VOCALS[0].path),parts=await Promise.all(['drums','theme','arrangement'].map(k=>decode('/assets/audio/ft/beginner-v1/'+k+'/16.wav')));
  const draft=createVocalTake({seed:24913,skills:{flow:10,sound:10,musicality:10,confidence:10},sliders:[5,4,5]}),clean=createVocalTake({...draft,kind:'clean'});
  const base={version:1,revision:1,text:{id:'text',name:'Тест',revision:1},sourceId:'vocal-01',draft,clean:null,mix:null,master:null};
  const variants={original:null,draft:base,clean:{...base,clean},mastered:{...base,clean,mix:{skill:10},master:{skill:10}}};
  const outputs={},metrics={};
  function encode(buffer){
   const bytes=new Uint8Array(44+frames*4),v=new DataView(bytes.buffer),str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
   str(0,'RIFF');v.setUint32(4,bytes.length-8,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint32(28,rate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,frames*4,true);
   let peak=0,power=0,finite=true;for(let i=0;i<frames;i++)for(let ch=0;ch<2;ch++){const x=buffer.getChannelData(ch)[i];finite&&=Number.isFinite(x);peak=Math.max(peak,Math.abs(x));power+=x*x;v.setInt16(44+i*4+ch*2,Math.round(Math.max(-1,Math.min(1,x))*32767),true);}
   let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return {wav:btoa(binary),metrics:{finite,peak,rms:Math.sqrt(power/(frames*2))}};
  }
  for(const [name,recording]of Object.entries(variants)){
   const c=new OfflineAudioContext(2,frames,rate),master=connectBeatResultMaster(c,c.destination),gain=c.createGain();gain.gain.value=.7;gain.connect(master.input);const fx=[];
   for(let i=0;i<3;i++){
    const source=c.createBufferSource(),profile=createBeatResult({seed:19,stage:i,skills:{beatmaking:10,sound:10},sliders:[5,5,5],targets:[[9,3,2],[6,5,4],[7,4,3]][i]});
    if(name==='mastered')profile.quality+=4;
    source.buffer=recording?transformBeatBuffer(c,parts[i],profile,32/3):parts[i];
    if(recording){const effect=connectBeatResult(c,profile,gain);fx.push(effect);source.connect(effect.input);}else source.connect(gain);source.start();
   }
   const source=c.createBufferSource();source.buffer=recording?transformVocalBuffer(c,voice,vocalPlaybackProfile(recording)):voice;source.connect(gain);source.start();
   const encoded=encode(await c.startRendering());outputs[name]=encoded.wav;metrics[name]={...encoded.metrics,quality:recording?vocalPlaybackProfile(recording).quality:100};fx.forEach(f=>f.dispose());master.dispose();
  }
  // Compare input/output spectral ratios on simultaneous frequencies, avoiding AGC ambiguity.
  const p=new OfflineAudioContext(1,44100,44100),probe=p.createBuffer(1,44100,44100),a=probe.getChannelData(0),frequencies=[110,1000,4300];
  for(let i=0;i<a.length;i++)a[i]=frequencies.reduce((s,f)=>s+.1*Math.sin(i/rate*2*Math.PI*f),0);
  const processed=transformVocalBuffer(p,probe,vocalPlaybackProfile(base),1).getChannelData(0);
  const magnitude=(a,f)=>{let re=0,im=0;for(let i=2000;i<a.length-1000;i++){re+=a[i]*Math.cos(i/rate*2*Math.PI*f);im+=a[i]*Math.sin(i/rate*2*Math.PI*f);}return Math.hypot(re,im);};
  const spectrum=frequencies.map(f=>({frequency:f,ratio:magnitude(processed,f)/magnitude(a,f)}));
  // Exercise real production player cleanup and ownership, not just offline render.
  const beat={version:3,id:'proof',kind:'beat',stages:[{},{},{}],drumId:'beginner-drums-16',audio:{bankVersion:1,bars:4,themeId:'beginner-theme-16',arrangementId:'beginner-arrangement-16'},recording:variants.mastered};
  const audio=new BeatAudio(),ok=await audio.playProject(beat),sources=audio.sources.length;audio.pause();const paused=audio.getSnapshot().positionSeconds;await audio.playProject(beat);const resumed=audio.getSnapshot().positionSeconds;audio.stop({fadeSeconds:.04});await new Promise(r=>setTimeout(r,100));const retired=audio.retiring.length;audio.dispose();
  return {outputs,metrics,spectrum,player:{ok,sources,paused,resumed,retired},decoded:VOCALS.length};
 });
 assert.equal(result.decoded,40);assert.ok(Object.values(result.metrics).every(m=>m.finite&&m.peak<=.99&&m.rms>.005));assert.ok(result.metrics.mastered.quality<=44);assert.equal(result.player.ok,true);assert.equal(result.player.sources,4);assert.equal(result.player.retired,0);assert.ok(Math.abs(result.player.paused-result.player.resumed)<.04);
 assert.ok(result.spectrum[2].ratio>result.spectrum[0].ratio*5);assert.ok(result.spectrum[2].ratio>result.spectrum[1].ratio*2);
 assert.equal(new Set(Object.values(result.outputs)).size,4);
 for(const [name,base64]of Object.entries(result.outputs))await writeFile(output+'/'+name+'.wav',Buffer.from(base64,'base64'));
 await writeFile(output+'/audio-evidence.json',JSON.stringify({...result,outputs:undefined},null,2));
 await writeFile(output+'/listen.html',`<!doctype html><meta charset="utf-8"><title>FT — проверка вокала</title><style>body{font:16px system-ui;background:#222b28;color:#e6e1ca;max-width:760px;margin:40px auto;padding:20px}audio{width:100%}section{padding:15px;border-bottom:1px solid #586255}p{line-height:1.5}</style><h1>Один голос, один бит, четыре версии</h1><p>Твой вокал №1 и новая тема Track 1 с дополнительными барабанами и басом. Игровые навыки — 10. Оригинал только для сравнения: стартовое оборудование не позволяет получить такой звук.</p>${[['original','Исходники без повреждения'],['draft','Черновик · плохой микрофон и ошибки'],['clean','Чистовая · немного увереннее'],['mastered','Чистовая + сведение + мастеринг']].map(([id,label])=>`<section><h2>${label}</h2><audio controls src="${id}.wav"></audio></section>`).join('')}`);
 console.log('PASS 40 native decodes, bounded real renders, hardware EQ, four synchronized sources and cleanup. '+JSON.stringify({...result,outputs:undefined}));
}finally{await browser.close();}
