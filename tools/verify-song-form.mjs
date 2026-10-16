import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core');
process.env.TEMP='D:/Project/Battle/artifacts/v-krugu-qa/browser-temp';process.env.TMP=process.env.TEMP;
await mkdir(process.env.TEMP,{recursive:true});
const output='D:/Project/Battle/artifacts/v-krugu-qa/task-6-song-form';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--autoplay-policy=no-user-gesture-required']});
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
 await page.route('**/__song-form',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/desktop-apps.css?rev=31"><style>body{margin:0;background:#19201b}#virtual-pc{height:100vh}.pc-app-root{height:100%}</style><section id="virtual-pc"><div class="pc-app-root" id="mount"></div></section>'}));
 await page.goto((process.env.SONG_FORM_BASE_URL||'http://127.0.0.1:4186')+'/__song-form');
 const initial=await page.evaluate(async()=>{
  const [{mountBeatStudio},{BeatAudio},{createVirtualPcState},{createBeat,startBeatStage,advanceBeatWork},{createVocalTake},{createBeatSongForm}]=await Promise.all([import('/src/beat-studio-view.js?rev=33'),import('/src/beat-audio.js?rev=33'),import('/src/virtual-pc-state.js?rev=33'),import('/src/beat-production.js?rev=33'),import('/src/vocal-result.js?rev=33'),import('/src/beat-song-form.js?rev=32')]);
  let state=createBeat(createVirtualPcState(),{id:'song-form',name:'Трек · вступление / куплет / концовка'},{},()=>.999).state;
  for(let stage=0;stage<3;stage++){state.music.needs={satiety:100,energy:100};state=advanceBeatWork(startBeatStage(state,'song-form',undefined,{},()=>.6).state,1000).state;}
  const beat=state.projects[0];beat.recording={version:1,revision:3,text:{id:'words',name:'Текст',revision:1},sourceId:'vocal-01',draft:createVocalTake({seed:24913}),clean:createVocalTake({kind:'clean',seed:30000}),mix:{skill:10},master:{skill:10}};
  // Select a stable project fixture that includes the optional same-take repeat.
  for(let i=1;!createBeatSongForm(beat).vocalOutro;i++)beat.recording.draft.seed=24913+i;
  window.songBeat=beat;window.songAudio=new BeatAudio();window.songView=mountBeatStudio(document.querySelector('#mount'),{getState:()=>state,getMetadata:()=>({skills:{}}),onChange:value=>state=value,audio:window.songAudio,initialProject:beat});
  return {form:createBeatSongForm(beat),tracks:document.querySelectorAll('.ft-lane').length};
 });
 assert.equal(initial.tracks,11);assert.equal(initial.form.vocalOutro,true);
 const clips=await page.evaluate(()=>[...document.querySelectorAll('.ft-lane')].map(row=>({stage:Number(row.dataset.stage),muted:row.dataset.muted,clips:[...row.querySelectorAll('[data-ft-role=clip]')].map(clip=>{const rect=clip.getBoundingClientRect(),lane=clip.parentElement.getBoundingClientRect();return {start:Number(clip.dataset.startBar),bars:Number(clip.dataset.bars),x:(rect.x-lane.x)/lane.width,y:rect.y,width:rect.width/lane.width};})})));
 for(const row of clips){
  assert.ok(row.clips.some(clip=>clip.start===3&&clip.bars===4));
  assert.ok(row.clips.every(clip=>Math.abs(clip.x-(clip.start-1)/16)<.002&&Math.abs(clip.width-clip.bars/16)<.002));
  assert.equal(new Set(row.clips.map(clip=>clip.y)).size,1);
 }
 assert.equal(clips.filter(row=>row.stage<3&&row.clips.some(clip=>clip.start===1)).length,3);
 assert.equal(clips.filter(row=>row.stage<3&&row.clips.some(clip=>clip.start===7)).length,3);
 assert.equal(clips.filter(row=>row.stage>=3&&row.clips.some(clip=>clip.start===7&&clip.bars===1)).length,2);
 assert.equal(clips.filter(row=>row.muted==='true').length,1);
 await page.getByRole('button',{name:'Play',exact:true}).click();
 await page.waitForFunction(()=>window.songAudio.status==='playing');
 const audio=await page.evaluate(()=>({duration:window.songAudio.getSnapshot().durationSeconds,parts:window.songAudio.descriptor.parts.map((part,i)=>({id:part.id,windows:part.windows,loop:window.songAudio.sources[i].loopEnd,frames:window.songAudio.sources[i].buffer.length,rate:window.songAudio.sources[i].buffer.sampleRate,channels:window.songAudio.sources[i].buffer.numberOfChannels})),kind:window.songAudio.descriptor.parts.at(-1).vocal.kind}));
 assert.equal(audio.duration,64/3);assert.equal(audio.parts.length,4);assert.equal(audio.kind,'clean');assert.ok(audio.parts.every(part=>part.loop===64/3&&Math.abs(part.frames/part.rate-64/3)<1/part.rate&&part.channels>=1),JSON.stringify(audio));
 await page.waitForFunction(()=>window.songAudio.getSnapshot().positionSeconds>14,{},{timeout:20000});
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 const paused=await page.evaluate(()=>({snapshot:window.songAudio.getSnapshot(),left:parseFloat(document.querySelector('[data-ft-role=playhead]').style.left),readout:document.querySelector('.ft-readout span').textContent}));
 assert.ok(paused.snapshot.positionSeconds>14&&paused.snapshot.positionSeconds<20);assert.ok(Math.abs(paused.left-paused.snapshot.positionSeconds/42.666666666666664*100)<.05);assert.ok(Number(paused.readout.slice(0,2))>=6);
 await page.screenshot({path:output+'/paused-eight-bar-form.png'});
 await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>window.songAudio.status==='playing');
 const resumed=await page.evaluate(()=>window.songAudio.getSnapshot().positionSeconds);assert.ok(Math.abs(resumed-paused.snapshot.positionSeconds)<.3);
 await page.getByRole('button',{name:'Stop',exact:true}).click();assert.equal(await page.evaluate(()=>window.songAudio.getSnapshot().positionSeconds),0);
 for(const width of [640,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:output+'/form-'+width+'.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 const stable=await page.evaluate(async()=>{const {createBeatSongForm}=await import('/src/beat-song-form.js?rev=32');return createBeatSongForm(JSON.parse(JSON.stringify(window.songBeat)));});assert.deepEqual(stable,initial.form);
 const alternates=[];
 for(const seed of [1,5,17]){
  const evidence=await page.evaluate(async seed=>{
   const [{chooseSongForm},{resolveBeatPlayback},{renderStudioTracks},{prepareBeatPcm}]=await Promise.all([import('/src/beat-song-form.js?rev=41'),import('/src/beat-playback.js?rev=41'),import('/src/ft-studio-view.js?rev=41'),import('/src/beat-pcm-runtime.js?rev=41')]);
   const beat=window.songBeat;beat.songForm=chooseSongForm(beat,{seed});
   const before=resolveBeatPlayback(beat).descriptor,after=resolveBeatPlayback(JSON.parse(JSON.stringify(beat))).descriptor;
   if(JSON.stringify(before)!==JSON.stringify(after))throw Error('reload changed recipe');
   if(!await window.songAudio.playProject(beat))throw Error(window.songAudio.error);
   renderStudioTracks(document.querySelector('.ft-workspace'),beat);
   const parts=[];
   for(const [i,part]of before.parts.entries()){
    const source=await window.songAudio.buffer(part.id),expected=prepareBeatPcm(window.songAudio.context,source,part,before.durationSeconds),actual=window.songAudio.sources[i].buffer;
    let maxDifference=0,peak=0;
    for(let channel=0;channel<actual.numberOfChannels;channel++){
     const a=actual.getChannelData(channel),b=expected.getChannelData(channel);
     for(let n=0;n<a.length;n++){maxDifference=Math.max(maxDifference,Math.abs(a[n]-b[n]));peak=Math.max(peak,Math.abs(a[n]));}
    }
    if(maxDifference!==0||!peak)throw Error('PCM mismatch or silence '+part.id);
    parts.push({id:part.id,songSection:part.songSection,windows:part.windows,sourceGainDb:part.sourceGainDb,maxDifference,peak});
   }
   window.songAudio.pause();return {seed,form:beat.songForm,parts};
  },seed);
  alternates.push(evidence);
  for(const [width,height]of [[1280,720],[1366,768],[1920,1080]]){
   await page.setViewportSize({width,height});
   await page.screenshot({path:output+'/alternate-'+seed+'-'+width+'.png'});
  }
 }
 assert.ok(alternates.some(e=>e.parts.some(p=>p.songSection)));
 const performance=[];
 for(const [width,height]of [[1280,720],[1366,768],[1920,1080]]){
 await page.setViewportSize({width,height});
 const timing=await page.evaluate(async()=>{
  const {renderStudioTracks}=await import('/src/ft-studio-view.js?rev=41'),frames=[],updates=[];let previous;
  for(let i=0;i<125;i++)await new Promise(resolve=>requestAnimationFrame(now=>{const start=performance.now();renderStudioTracks(document.querySelector('.ft-workspace'),window.songBeat);if(i>4){frames.push(now-previous);updates.push(performance.now()-start);}previous=now;resolve();}));
  const stats=a=>({p95:[...a].sort((x,y)=>x-y)[Math.ceil(a.length*.95)-1],max:Math.max(...a)});return {frames:stats(frames),updates:stats(updates)};
 });
 performance.push({width,height,...timing});assert.ok(timing.frames.p95<=25);assert.ok(timing.updates.p95<=20);
 }
 await page.evaluate(()=>{window.songView.dispose();window.songAudio.dispose();});assert.deepEqual(errors,[]);
 const evidence={passed:true,initial,clips,audio,paused,resumed,alternates,performance,errors};await writeFile(output+'/evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));await context.close();
}finally{await browser.close();}
