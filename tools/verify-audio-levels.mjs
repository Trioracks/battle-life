import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {encodePcm16} from './audio/source-loop.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output='artifacts/audio-levels';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__audio-level-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated audio QA</title>'}));
 await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4173')+'/__audio-level-qa');
 const result=await page.evaluate(async()=>{
  const [{BeatAudio},{createBeat},{resolveBeatPlayback},{createVocalTake},{createBeatResult},{BEAT_PRACTICE},{USER_DRUM_BANK}]=await Promise.all([
   import('/src/beat-audio.js'),import('/src/beat-production.js'),import('/src/beat-playback.js'),import('/src/vocal-result.js'),import('/src/beat-result.js'),import('/src/beat-catalog.js'),import('/src/beat-beginner-bank.js')]);
  const rate=22050,loop=32/3,cache=new Map();
  const render=async descriptor=>{
   const c=new OfflineAudioContext(2,Math.ceil((descriptor.durationSeconds+.05)*rate),rate);
   const audio=new BeatAudio();audio.unlock=async()=>{audio.context=c;};
   // Same real player graph, with only the non-realtime context startup adapted.
   audio.cache=cache;
   if(!await audio.playDescriptor(descriptor))throw Error(audio.error);
   const buffer=await c.startRendering(),channels=[0,1].map(ch=>buffer.getChannelData(ch).slice(Math.round(.04*rate),Math.round(.04*rate)+Math.round(descriptor.durationSeconds*rate)));
   let peak=0,power=0;for(const ch of channels)for(const x of ch){if(!Number.isFinite(x))throw Error('Nonfinite audio');peak=Math.max(peak,Math.abs(x));power+=x*x;}
   audio.stop();return {channels,peak,rms:Math.sqrt(power/(channels[0].length*2))};
  };
  const checks=[],examples={};let maxError=0;
  for(const skill of [10,49,75,100]){
   const skills={beatmaking:skill,sound:skill,flow:skill,musicality:skill,confidence:skill};
   const b=createBeat({projects:[]},{id:'qa-'+skill,name:'QA'},skills,()=>.5).state.projects[0];
   b.stages=Array.from({length:3},()=>({sliders:[5,5,5],fit:50,quality:skill}));
   b.mix.layers=[0,1,2].map(stage=>createBeatResult({seed:19,stage,skills,sliders:[5,5,5],targets:BEAT_PRACTICE.targets[stage]}));
   b.audio.themeId='beginner-theme-16';
   b.recording={version:1,revision:1,text:{id:'qa-text',name:'QA',revision:1},sourceId:'vocal-01',draft:createVocalTake({seed:24913,skills}),clean:null,mix:null,master:null};
   // Compare the same verse, not different intro/outro silence distributions.
   const renders=[];
   for(let stage=0;stage<3;stage++){
    b.recording.mix=stage>=1?{skill}:null;b.recording.master=stage>=2?{skill}:null;
    const d=resolveBeatPlayback(b).descriptor;d.durationSeconds=loop;d.parts.forEach(p=>delete p.windows);
    renders.push(await render(d));
   }
   const db=renders.slice(1).map(r=>20*Math.log10(r.rms/renders[0].rms));
   for(let stage=1;stage<3;stage++)for(let ch=0;ch<2;ch++)for(let i=0;i<renders[0].channels[ch].length;i++)
    maxError=Math.max(maxError,Math.abs(renders[stage].channels[ch][i]-renders[0].channels[ch][i]*10**((stage===1?3:4)/20)));
   checks.push({skill,db,peaks:renders.map(r=>r.peak)});
   if(skill===49)for(const [i,name]of ['raw','mixed','mastered'].entries())examples[name]=renders[i].channels.map(c=>Array.from(c));
   for(const drum of USER_DRUM_BANK){
    b.drumId=drum.id;const d=resolveBeatPlayback(b).descriptor,dry=await render(d);
    checks.push({skill,drum:drum.id,peak:dry.peak,rms:dry.rms,duration:d.durationSeconds});
   }
  }
  return {checks,maxError,rate,examples};
 });
 assert.deepEqual(errors,[]);
 for(const c of result.checks){
  if(c.db){assert.ok(Math.abs(c.db[0]-3)<.001);assert.ok(Math.abs(c.db[1]-4)<.001);assert.ok(c.peaks.every(p=>p<.85));}
  else {assert.ok(c.peak<.85,JSON.stringify(c));assert.ok(c.rms>.001);assert.equal(c.duration,64/3);}
 }
 assert.ok(result.maxError<1e-5,'gain must not change the waveform or hit the safety shaper');
 for(const [name,channels]of Object.entries(result.examples))await writeFile(output+'/'+name+'.wav',encodePcm16({sampleRate:result.rate,channels:channels.map(c=>Float32Array.from(c))}));
 delete result.examples;await writeFile(output+'/web-audio-verification.json',JSON.stringify(result,null,2)+'\n');
 console.log('PASS: real player, +3/+4 dB, identical performance, 40 mastered author-drum mixes below limiter threshold',JSON.stringify({maxError:result.maxError,comparisons:result.checks.filter(c=>c.db)}));
}finally{await browser.close();}
