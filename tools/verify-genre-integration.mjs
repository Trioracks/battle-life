import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require('D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core');
const output='D:/Codex/Builds/Battle/genres-rev34';await mkdir(output,{recursive:true});
process.env.TEMP='D:/Codex/Temp';process.env.TMP='D:/Codex/Temp';
const browser=await chromium.launch({headless:true,executablePath:'D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__genre-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/desktop-apps.css?rev=34"><link rel="stylesheet" href="/apartment-v3.css?rev=33"><style>body{margin:0}#virtual-pc{height:900px}.ft-workspace{height:100%}</style><section id="virtual-pc"></section>'}));
 await page.goto('http://127.0.0.1:4173/__genre-qa');
 await page.evaluate(async()=>{
  const [{createVirtualPcState},{mountBeatStudio}]=await Promise.all([import('/src/virtual-pc-state.js?rev=34'),import('/src/beat-studio-view.js?rev=34')]);
  window.state=createVirtualPcState();window.skills={beatmaking:25};window.studio=mountBeatStudio(document.querySelector('#virtual-pc'),{getState:()=>window.state,getMetadata:()=>({skills:window.skills,gameDay:1}),onChange:s=>window.state=s,audio:{stop(){},getSnapshot(){return {};}}});
 });
 await page.getByRole('button',{name:'Закрыть',exact:true}).click();await page.getByRole('button',{name:'Жанры',exact:true}).click();
 await page.getByRole('button',{name:'Выбрать: Бум-бэп',exact:true}).click();await page.getByRole('button',{name:'Отмена',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>state.music.genres.chosen),[]);
 await page.getByRole('button',{name:'Жанры',exact:true}).click();await page.getByRole('button',{name:'Выбрать: Бум-бэп',exact:true}).click();await page.getByRole('button',{name:'Подтвердить выбор',exact:true}).click();
 await page.getByRole('button',{name:'Новый проект',exact:true}).click();await page.getByLabel('Жанр проекта',{exact:true}).selectOption('boombap');await page.getByLabel('Название бита').fill('01.09.2012 — Проверка жанра');await page.getByRole('button',{name:'Начать проект',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.projects[0].genre),'boombap');assert.equal(await page.locator('input[type=range]').count(),3);
 assert.match(await page.locator('[data-ft-role=genre-summary]').innerText(),/Бум-бэп.*0.00.*75/);
 const sliderRows=await page.locator('.ft-production input[type=range]').evaluateAll(inputs=>inputs.map(input=>({input:input.getBoundingClientRect().toJSON(),label:input.previousElementSibling.getBoundingClientRect().toJSON()})));
 for(let i=0;i<sliderRows.length;i++){assert.ok(sliderRows[i].input.y>=sliderRows[i].label.bottom,'each slider sits below its caption');if(i)assert.ok(sliderRows[i].label.y>=sliderRows[i-1].input.bottom,'slider rows never interleave');}
 await page.screenshot({path:output+'/genre-project.png'});
 const roundtrip=await page.evaluate(async()=>{
  const {saveVirtualPcState,loadVirtualPcState}=await import('/src/virtual-pc-state.js?rev=34');const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  saveVirtualPcState(storage,state);return JSON.stringify(loadVirtualPcState(storage).state)===JSON.stringify(state);
 });assert.ok(roundtrip);
 await page.evaluate(async()=>{
  studio.dispose();const {createBeatWorkPanel}=await import('/src/beat-work-view.js?rev=34');const panel=createBeatWorkPanel(document);
  document.querySelector('#virtual-pc').append(panel.element);panel.update({beat:{kind:'beat',name:'Первые шаги'},job:{stage:0,total:58,elapsed:29,skill:10,genreSkill:0},skill:10+1/6,genreProgress:{name:'Экспериментальный',xp:1/6,cap:75},needs:{satiety:64,energy:69},clockLabel:'01.09.2012 · 14:30'});
 });assert.equal(await page.locator('[data-work-role=genre-progress]').getAttribute('aria-valuetext'),'0.17 из 75');await page.screenshot({path:output+'/genre-training.png'});
 const variants=await page.evaluate(async()=>{
  const [{createBeatResult},{resolveBeatPlayback},{createVocalTake},{transformBeatBuffer,connectBeatResult,connectBeatResultMaster},{transformVocalBuffer},{arrangeSongBuffer}]=await Promise.all([import('/src/beat-result.js?rev=34'),import('/src/beat-playback.js?rev=34'),import('/src/vocal-result.js?rev=33'),import('/src/beat-result-dsp.js?rev=34'),import('/src/vocal-result-dsp.js?rev=34'),import('/src/beat-song-form.js?rev=32')]);
  const rate=22050,frames=Math.round(64/3*rate),decoder=new OfflineAudioContext(2,frames,rate),paths=['/assets/audio/ft/beginner-v1/drums/16.wav','/assets/audio/ft/beginner-v1/theme/16.wav','/assets/audio/ft/beginner-v1/arrangement/16.wav','/assets/audio/ft/vocals-v1/01.wav'];
  const buffers=await Promise.all(paths.map(async path=>{const r=await fetch(path);if(!r.ok)throw Error(path);return decoder.decodeAudioData(await r.arrayBuffer());})),out=[];
  for(const xp of [0,25,50]){
   const genreProfile={version:1,id:'experimental',xp},skills={beatmaking:65,sound:65,flow:65,musicality:65,confidence:65},layers=[0,1,2].map(stage=>createBeatResult({seed:19,stage,skills,sliders:[5,5,5],targets:[5,5,5],genreProfile}));
   const beat={version:3,id:'genre-demo',kind:'beat',genre:'experimental',genreProfile,stages:[{},{},{}],bpm:90,drumId:'beginner-drums-16',audio:{bankVersion:1,bars:4,themeId:'beginner-theme-16',arrangementId:'beginner-arrangement-16'},mix:{version:2,seed:19,skills,layers},recording:{version:1,revision:3,text:{id:'t',name:'T',revision:1},sourceId:'vocal-01',draft:createVocalTake({seed:24913,skills,sliders:[5,4,5]}),clean:null,mix:{skill:65},master:{skill:65}}};
   const descriptor=resolveBeatPlayback(beat).descriptor,c=new OfflineAudioContext(2,frames,rate),limiter=connectBeatResultMaster(c,c.destination),master=c.createGain();master.gain.value=.7;master.connect(limiter.input);
   for(const [i,part]of descriptor.parts.entries()){
    let b=part.vocal?transformVocalBuffer(c,buffers[i],part.vocal,32/3):transformBeatBuffer(c,buffers[i],part.result,32/3);
    if(part.windows)b=arrangeSongBuffer(c,b,part.windows,descriptor.durationSeconds,part.loopSeconds);
    const source=c.createBufferSource();source.buffer=b;source.connect(part.result?connectBeatResult(c,part.result,master).input:master);source.start();
   }
   const audio=await c.startRendering(),a=audio.getChannelData(0),b=audio.getChannelData(1);let peak=0,power=0,hash=2166136261;
   const bytes=new Uint8Array(44+frames*4),view=new DataView(bytes.buffer),str=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
   str(0,'RIFF');view.setUint32(4,bytes.length-8,true);str(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,frames*4,true);
   for(let i=0;i<frames;i++)for(let ch=0;ch<2;ch++){const x=(ch?b:a)[i];if(!Number.isFinite(x))throw Error('nonfinite');peak=Math.max(peak,Math.abs(x));power+=x*x;const pcm=Math.round(Math.max(-1,Math.min(1,x))*32767);view.setInt16(44+i*4+ch*2,pcm,true);hash=Math.imul(hash^pcm,16777619)>>>0;}
   let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
   out.push({xp,duration:audio.duration,peak,rms:Math.sqrt(power/(frames*2)),hash,vocalQuality:descriptor.parts[3].vocal.quality,vocalGainDb:descriptor.parts[3].vocal.vocalGainDb,wav:btoa(binary)});
  }return out;
 });
 for(const v of variants){assert.ok(Math.abs(v.duration-64/3)<.001);assert.ok(v.peak<=.99&&v.rms>.001);assert.ok(v.vocalQuality<=44);assert.equal(v.vocalGainDb,4.5);await writeFile(output+'/genre-xp-'+v.xp+'.wav',Buffer.from(v.wav,'base64'));delete v.wav;}
 assert.equal(new Set(variants.map(v=>v.hash)).size,3);assert.deepEqual(errors,[]);
 await writeFile(output+'/verification.json',JSON.stringify({roundtrip,variants,errors},null,2));console.log(JSON.stringify({roundtrip,variants,errors},null,2));
}finally{await browser.close();}
