import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {encodePcm16} from './audio/source-loop.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core'),out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const frames=JSON.parse(await readFile(out+'/camera-audio-frames.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try{
 const page=await browser.newPage();await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/src/beat-audio.js');
 const results=await page.evaluate(async frames=>{
  const [{BeatAudio},{createPcRoomOutput,roomAudioParameters}]=await Promise.all([import('/src/beat-audio.js?rev=40'),import('/src/pc-room-audio.js?rev=40')]);
  const renders=[];
  for(const [name,frame]of Object.entries(frames)){
   const rate=22050,context=new OfflineAudioContext(2,rate*4,rate),audio=new BeatAudio({outputFactory:createPcRoomOutput});audio.context=context;
   audio.unlock=async()=>{audio.output??=audio.outputFactory(context);audio.output.update(audio.roomFrame);};audio.setRoomFrame(frame);
   const descriptor={key:'native-room',owner:'frozen',durationSeconds:32/3,parts:[{id:'primitive',loopSeconds:32/3},{id:'melody',loopSeconds:32/3}]},before=JSON.stringify(descriptor);
   if(!await audio.playDescriptor(descriptor))throw Error(audio.error);const source=audio.sources[0];
   audio.setRoomFrame(frame);if(source!==audio.sources[0]||source.playbackRate.value!==1||before!==JSON.stringify(descriptor))throw Error('Playback mutated');
   const buffer=await context.startRendering(),channels=[0,1].map(ch=>Array.from(buffer.getChannelData(ch).slice(rate)));
   const power=a=>a.reduce((sum,x)=>sum+x*x,0)/a.length,rms=channels.map(a=>Math.sqrt(power(a))),roughness=channels.map(a=>Math.sqrt(power(a.slice(1).map((x,i)=>x-a[i])))/Math.sqrt(power(a)));
   renders.push({name,parameters:roomAudioParameters(frame),rms,roughness,channels,rate});audio.stop();audio.output.dispose();
  }
  return renders;
 },frames);
 const by=Object.fromEntries(results.map(r=>[r.name,r])),level=r=>Math.hypot(...r.rms);
 assert.ok(level(by.kitchen)<level(by.near)*.2);assert.ok(by.kitchen.roughness[0]<by.near.roughness[0]);
 assert.ok((by.right.rms[1]-by.right.rms[0])*(by.left.rms[1]-by.left.rms[0])<0);
 for(const r of results)await writeFile(out+'/room-'+r.name+'.wav',encodePcm16({sampleRate:r.rate,channels:r.channels.map(a=>Float32Array.from(a))}));
 const measurements=results.map(({channels,...r})=>r);await writeFile(out+'/room-audio-measurements.json',JSON.stringify({listened:false,reason:'No listening tool available; native Web Audio rendering and measurements only',measurements},null,2));
 console.log(JSON.stringify(measurements));console.log('PASS native post-master graph: distance, partition cutoff, stereo reversal, unchanged sources/descriptor/playbackRate. Listening not performed.');
}finally{await browser.close();}
