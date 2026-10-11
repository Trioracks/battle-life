import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core');
const output='D:/Codex/Builds/Battle/expanded-bank';await mkdir(output,{recursive:true});process.env.TEMP='D:/Codex/Temp';process.env.TMP='D:/Codex/Temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage();await page.route('**/__expanded-bank',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Bank verification</title>'}));await page.goto('http://127.0.0.1:4173/__expanded-bank');
 const result=await page.evaluate(async()=>{
  const [{BEGINNER_BANK,BEGINNER_RECIPES},{createBeat,startBeatStage,advanceBeatWork},{createVirtualPcState},{resolveBeatPlayback},{BeatAudio}]=await Promise.all([import('/src/beat-beginner-bank.js?rev=31'),import('/src/beat-production.js?rev=32'),import('/src/virtual-pc-state.js?rev=32'),import('/src/beat-playback.js?rev=32'),import('/src/beat-audio.js?rev=32')]);
  const decoder=new OfflineAudioContext(2,470400,44100),buffers=new Map(),mixes=[],projects=[];
  for(const part of BEGINNER_BANK){const r=await fetch(part.path);if(!r.ok)throw Error(part.path);const buffer=await decoder.decodeAudioData(await r.arrayBuffer());if(buffer.length!==470400||buffer.sampleRate!==44100)throw Error('Invalid duration '+part.id);buffers.set(part.id,buffer);}
  for(let i=0;i<90;i++){
   let state=createBeat(createVirtualPcState(),{id:'qa-'+i,name:'Сборка '+(i+1)},{beatmaking:10,sound:10},()=>(i+.5)/90).state;
   for(let stage=0;stage<3;stage++){state.music.needs={satiety:100,energy:100};state=advanceBeatWork(startBeatStage(state,'qa-'+i,[3,7,4],{beatmaking:10,sound:10}).state,1000).state;}
   const restored=createVirtualPcState(JSON.parse(JSON.stringify(state))),beat=restored.projects[0],resolved=resolveBeatPlayback(beat);
   if(!resolved.ok)throw Error(resolved.reason);const ids=resolved.descriptor.parts.map(p=>p.id),recipe=BEGINNER_RECIPES[i];
   if(JSON.stringify(ids)!==JSON.stringify([recipe.drumsId,recipe.themeId,recipe.arrangementId]))throw Error('Recipe selection '+i);
   if(beat.genre!=='practice'||Object.values(restored.music.genrePractice).some(v=>v!==0))throw Error('Unexpected genre training');
   const sources=ids.map(id=>buffers.get(id));let peak=0,power=0,hash=2166136261;
   for(let frame=0;frame<470400;frame++)for(let ch=0;ch<2;ch++){
    const x=.7*sources.reduce((sum,b)=>sum+b.getChannelData(Math.min(ch,b.numberOfChannels-1))[frame],0);
    if(!Number.isFinite(x))throw Error('Nonfinite mix');peak=Math.max(peak,Math.abs(x));power+=x*x;
    if(ch===0&&frame%8===0)hash=Math.imul(hash^Math.round(x*32767),16777619)>>>0;
   }
   mixes.push({id:recipe.id,peak,rms:Math.sqrt(power/940800),hash});projects.push(beat);
  }
  const playback=[];const audio=new BeatAudio();
  for(const i of [0,18,24,59,65,89]){const ok=await audio.playProject(projects[i]);playback.push({id:i+1,ok,sources:audio.sources.length,duration:audio.descriptor?.durationSeconds});audio.stop();}
  audio.dispose();return {decoded:buffers.size,mixes,playback};
 });
 assert.equal(result.decoded,142);assert.equal(result.mixes.length,90);assert.equal(new Set(result.mixes.map(m=>m.hash)).size,90);
 assert.ok(result.mixes.every(m=>m.peak<.99&&m.rms>.01));assert.ok(result.playback.every(p=>p.ok&&p.sources===3&&p.duration===32/3));
 await writeFile(output+'/evidence.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({passed:true,decoded:result.decoded,uniqueMixes:result.mixes.length,maxPeak:Math.max(...result.mixes.map(m=>m.peak)),minRms:Math.min(...result.mixes.map(m=>m.rms)),playback:result.playback}));
}finally{await browser.close();}
