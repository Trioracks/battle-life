// Four comparable in-game mixes. Same stems, decisions, gear and seed; skills differ.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core');
const output=process.env.SKILL_DEMO_OUTPUT||'D:/Codex/Builds/Battle/skill-demos';
await mkdir(output,{recursive:true});process.env.TEMP='D:/Codex/Temp';process.env.TMP='D:/Codex/Temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
try{
 const page=await browser.newPage();await page.route('**/__skill-demo',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Skill mixes</title>'}));
 await page.goto('http://127.0.0.1:4173/__skill-demo');
 const result=await page.evaluate(async()=>{
  const [{transformBeatBuffer,connectBeatResult,connectBeatResultMaster},{createBeatResult},{createVocalTake},{transformVocalBuffer},{BEAT_PRACTICE}]=await Promise.all([import('/src/beat-result-dsp.js?rev=31'),import('/src/beat-result.js?rev=28'),import('/src/vocal-result.js?rev=31'),import('/src/vocal-result-dsp.js?rev=31'),import('/src/beat-catalog.js?rev=31')]);
  // Fixed beginner decisions against genre-free targets; identical fits to the original demo.
  const decisions=[[2,8,8],[5,5,8],[3,8,8]];
  const rate=44100,loop=32/3,frames=940800,decoder=new OfflineAudioContext(2,frames,rate);
  const paths=['/assets/audio/ft/beginner-v1/drums/16.wav','/assets/audio/ft/beginner-v1/theme/16.wav','/assets/audio/ft/beginner-v1/arrangement/16.wav','/assets/audio/ft/vocals-v1/01.wav'];
  const buffers=await Promise.all(paths.map(async p=>{const r=await fetch(p);if(!r.ok)throw Error(p);return decoder.decodeAudioData(await r.arrayBuffer());}));
  const variants=[];
  for(const skill of [10,30,75,100]){
   const c=new OfflineAudioContext(2,frames,rate),end=connectBeatResultMaster(c,c.destination),master=c.createGain();master.gain.value=.7;master.connect(end.input);
   const graphs=[],qualities=[],skills={beatmaking:skill,sound:skill,flow:skill,musicality:skill,confidence:skill};
   for(let stage=0;stage<3;stage++){
    const profile=createBeatResult({seed:19,stage,skills,sliders:decisions[stage],targets:BEAT_PRACTICE.targets[stage]});qualities.push(profile.quality);
    const source=c.createBufferSource();source.buffer=transformBeatBuffer(c,buffers[stage],profile,loop);source.loop=true;source.loopEnd=loop;
    const effect=connectBeatResult(c,profile,master);graphs.push(effect);source.connect(effect.input);source.start();source.stop(loop*2);
   }
   const vocal=createVocalTake({seed:24913,kind:'draft',skills,sliders:[5,4,5]}),source=c.createBufferSource();
   source.buffer=transformVocalBuffer(c,buffers[3],vocal,loop);source.loop=true;source.loopEnd=loop;source.connect(master);source.start();source.stop(loop*2);
   const rendered=await c.startRendering(),channels=[...Array(2)].map((_,i)=>rendered.getChannelData(i));
   let peak=0,power=0;for(const channel of channels)for(const x of channel){if(!Number.isFinite(x))throw Error('Nonfinite render');peak=Math.max(peak,Math.abs(x));power+=x*x;}
   // Same .7 master as the game; do not individually normalize the examples.
   const bytes=new Uint8Array(44+frames*4),view=new DataView(bytes.buffer),str=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
   str(0,'RIFF');view.setUint32(4,bytes.length-8,true);str(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,frames*4,true);
   for(let i=0;i<frames;i++)for(let ch=0;ch<2;ch++){const fade=Math.min(1,i/220,(frames-1-i)/882);view.setInt16(44+i*4+ch*2,Math.round(Math.max(-1,Math.min(1,channels[ch][i]))*fade*32767),true);}
   let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
   variants.push({skill,qualities,vocalQuality:vocal.quality,peak,rms:Math.sqrt(power/(2*frames)),duration:frames/rate,wav:btoa(binary)});
   graphs.forEach(g=>g.dispose());end.dispose();master.disconnect();
  }
  return {paths,decisions,targets:BEAT_PRACTICE.targets,variants};
 });
 for(const v of result.variants){
  assert.ok(v.peak<.981&&v.rms>.01);assert.equal(v.duration,64/3);
  const base=output+'/skill-'+v.skill;await writeFile(base+'.wav',Buffer.from(v.wav,'base64'));
  const converted=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-y','-i',base+'.wav','-codec:a','libmp3lame','-b:a','192k',base+'.mp3'],{windowsHide:true});
  assert.equal(converted.status,0,String(converted.stderr));
 }
 assert.equal(new Set(result.variants.map(v=>v.wav)).size,4);
 const evidence={...result,variants:result.variants.map(({wav,...v})=>v),note:'Same stems and sliders. All relevant skills vary together. Starter desk mic/onboard interface in all four versions. No mastering, draft vocal, two four-bar loops, 90 BPM.'};
 await writeFile(output+'/evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await browser.close();}
