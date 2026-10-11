// Four comparable in-game mixes. Same stems, decisions, gear and seed; skills differ.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core');
const output=process.env.SKILL_DEMO_OUTPUT||'D:/Codex/Builds/Battle/skill-demos-rev33';
await mkdir(output,{recursive:true});process.env.TEMP='D:/Codex/Temp';process.env.TMP='D:/Codex/Temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
try{
 const page=await browser.newPage();await page.route('**/__skill-demo',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Skill mixes</title>'}));
 await page.goto('http://127.0.0.1:4173/__skill-demo');
 const result=await page.evaluate(async()=>{
  const [{transformBeatBuffer,connectBeatResult,connectBeatResultMaster},{createBeatResult},{createVocalTake},{transformVocalBuffer},{BEAT_PRACTICE},{resolveBeatPlayback},{arrangeSongBuffer,createBeatSongForm}]=await Promise.all([import('/src/beat-result-dsp.js?rev=32'),import('/src/beat-result.js?rev=28'),import('/src/vocal-result.js?rev=33'),import('/src/vocal-result-dsp.js?rev=33'),import('/src/beat-catalog.js?rev=31'),import('/src/beat-playback.js?rev=33'),import('/src/beat-song-form.js?rev=32')]);
  // Fixed beginner decisions against genre-free targets; identical fits to the original demo.
  const decisions=[[2,8,8],[5,5,8],[3,8,8]];
  const rate=44100,loop=32/3,frames=940800,decoder=new OfflineAudioContext(2,frames,rate);
  const paths=['/assets/audio/ft/beginner-v1/drums/16.wav','/assets/audio/ft/beginner-v1/theme/16.wav','/assets/audio/ft/beginner-v1/arrangement/16.wav','/assets/audio/ft/vocals-v1/01.wav'];
  const buffers=await Promise.all(paths.map(async p=>{const r=await fetch(p);if(!r.ok)throw Error(p);return decoder.decodeAudioData(await r.arrayBuffer());}));
  const variants=[];
  for(const {skill,mixed,mastered=false} of [{skill:10,mixed:false},...[10,30,75,100].map(skill=>({skill,mixed:true})),{skill:100,mixed:true,mastered:true}]){
   const c=new OfflineAudioContext(2,frames,rate),end=connectBeatResultMaster(c,c.destination),master=c.createGain();master.gain.value=.7;master.connect(end.input);
   const graphs=[],skills={beatmaking:skill,sound:skill,flow:skill,musicality:skill,confidence:skill};
   const layers=[0,1,2].map(stage=>createBeatResult({seed:19,stage,skills,sliders:decisions[stage],targets:BEAT_PRACTICE.targets[stage]}));
   const beat={version:3,id:'friend-demo-27',kind:'beat',stages:[{},{},{}],bpm:90,drumId:'beginner-drums-16',audio:{bankVersion:1,bars:4,themeId:'beginner-theme-16',arrangementId:'beginner-arrangement-16'},mix:{version:2,seed:19,skills,layers},recording:{version:1,revision:1,text:{id:'demo-text',name:'Демо',revision:1},sourceId:'vocal-01',draft:createVocalTake({seed:24913,kind:'draft',skills,sliders:[5,4,5]}),clean:null,mix:mixed?{skill}:null,master:null}};
   if(mastered)beat.recording.master={skill};
   const resolved=resolveBeatPlayback(beat);if(!resolved.ok)throw Error(resolved.reason);
   const descriptor=resolved.descriptor,qualities=descriptor.parts.filter(p=>p.result).map(p=>p.result.quality);
   for(const [index,part]of descriptor.parts.entries()){
    const source=c.createBufferSource();let buffer=part.vocal?transformVocalBuffer(c,buffers[index],part.vocal,loop):transformBeatBuffer(c,buffers[index],part.result,loop);
    if(part.windows)buffer=arrangeSongBuffer(c,buffer,part.windows,descriptor.durationSeconds,part.loopSeconds);
    source.buffer=buffer;source.loop=true;source.loopEnd=part.windows?descriptor.durationSeconds:part.loopSeconds;
    if(part.result){const effect=connectBeatResult(c,part.result,master);graphs.push(effect);source.connect(effect.input);}else source.connect(master);
    source.start();source.stop(loop*2);
   }
   const rendered=await c.startRendering(),channels=[...Array(2)].map((_,i)=>rendered.getChannelData(i));
   let peak=0,power=0;for(const channel of channels)for(const x of channel){if(!Number.isFinite(x))throw Error('Nonfinite render');peak=Math.max(peak,Math.abs(x));power+=x*x;}
   // Same .7 master as the game; do not individually normalize the examples.
   const bytes=new Uint8Array(44+frames*4),view=new DataView(bytes.buffer),str=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
   str(0,'RIFF');view.setUint32(4,bytes.length-8,true);str(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,frames*4,true);
   for(let i=0;i<frames;i++)for(let ch=0;ch<2;ch++){const fade=Math.min(1,i/220,(frames-1-i)/882);view.setInt16(44+i*4+ch*2,Math.round(Math.max(-1,Math.min(1,channels[ch][i]))*fade*32767),true);}
   let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
   variants.push({skill,mixed,mastered,form:createBeatSongForm(beat),qualities,vocalQuality:descriptor.parts.at(-1).vocal.quality,vocalGainDb:descriptor.parts.at(-1).vocal.vocalGainDb,peak,rms:Math.sqrt(power/(2*frames)),duration:frames/rate,wav:btoa(binary)});
   graphs.forEach(g=>g.dispose());end.dispose();master.disconnect();
  }
  return {paths,decisions,targets:BEAT_PRACTICE.targets,variants};
 });
 for(const v of result.variants){
  assert.ok(v.peak<.981&&v.rms>.01);assert.equal(v.duration,64/3);
  const base=output+'/'+(v.mixed?'skill-':'before-mix-')+v.skill+(v.mastered?'-mastered':'');await writeFile(base+'.wav',Buffer.from(v.wav,'base64'));
  const converted=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-y','-i',base+'.wav','-codec:a','libmp3lame','-b:a','192k',base+'.mp3'],{windowsHide:true});
  assert.equal(converted.status,0,String(converted.stderr));
 }
 assert.equal(new Set(result.variants.map(v=>v.wav)).size,6);
 const evidence={...result,variants:result.variants.map(({wav,...v})=>v),note:'Same stems and decisions. Starter desk mic/onboard interface; draft vocal, 90 BPM. Four mixed tracks (+3dB voice): 2bar drums intro + 4bar full body + 2bar lead outro with same-vocal 1bar repeat. Extra skill100 mastered adds another1.5dB voice while preserving hardware limits. Extra skill10 before-mix preview stays a dry4bar working loop repeated twice. No individual loudness normalization.'};
 await writeFile(output+'/evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await browser.close();}
