// Same authored stems, real studio decisions, and the production BeatAudio graph.
// A fresh browser context keeps this independent of every player's saved game.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/beat-decisions-20261011',scratch=process.env.BATTLE_QA_TEMP||'D:/Codex/Temp';
await mkdir(output,{recursive:true});await mkdir(scratch,{recursive:true});process.env.TEMP=scratch;process.env.TMP=scratch;
process.env.PLAYWRIGHT_BROWSERS_PATH??='D:/Codex/Caches/ms-playwright';
const sourcePaths=['drums','theme','arrangement'].map(kind=>new URL('../assets/audio/ft/beginner-v1/'+kind+'/04.wav',import.meta.url));
sourcePaths.push(new URL('../stems/drums/shops/01.mp3',import.meta.url));
const hashes=()=>Promise.all(sourcePaths.map(async path=>createHash('sha256').update(await readFile(path)).digest('hex')));
const before=await hashes(),browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/__decision-check',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Beat production decision verification</title><main id="studio"></main>'}));
 await page.goto((process.env.BATTLE_URL||'http://127.0.0.1:4173')+'/__decision-check');
 const result=await page.evaluate(async()=>{
  const [{mountBeatStudio},{BeatAudio},{createBeatWorkAudio},{advanceBeatWork,restoreMusicNeeds,startBeatStage},{createVirtualPcState},{resolveBeatPlayback}]=await Promise.all([import('/src/beat-studio-view.js?rev=32'),import('/src/beat-audio.js?rev=32'),import('/src/beat-work-audio.js'),import('/src/beat-production.js?rev=32'),import('/src/virtual-pc-state.js?rev=32'),import('/src/beat-playback.js?rev=32')]);
  const targets=[[9,3,2],[5,5,8],[9,4,2]],poor=[[0,10,10],[0,0,0],[0,10,10]],root=document.querySelector('#studio');
  const rate=44100,length=470400,lead=1764,rms=a=>Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length),peak=a=>a.reduce((m,v)=>Math.max(m,Math.abs(v)),0),difference=(a,b)=>rms(a.map((v,i)=>v-b[i]));
  const wav=channels=>{
   const bytes=new Uint8Array(44+length*4),view=new DataView(bytes.buffer),str=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
   str(0,'RIFF');view.setUint32(4,bytes.length-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,length*4,true);
   for(let i=0;i<length;i++)for(let ch=0;ch<2;ch++)view.setInt16(44+i*4+ch*2,Math.round(Math.max(-1,Math.min(1,channels[ch][i]))*32767),true);
   let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary);
  };
  // Only lifecycle state is adapted. PCM, sources, effects and source scheduling
  // are the actual player against native OfflineAudioContext.
  const render=async(beat,workStage=null)=>{
   const context=new OfflineAudioContext(2,length+lead,rate),facade=new Proxy(context,{get(target,key){if(key==='state')return 'running';if(key==='resume'||key==='close')return async()=>{};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}}),audio=new BeatAudio({contextFactory:()=>facade});
   if(!await audio.playProject(beat,{workStage}))throw Error('Production audio graph failed: '+audio.error);
   const descriptor=structuredClone(audio.descriptor),sources=audio.sources.map((source,index)=>({id:descriptor.parts[index].id,loop:source.loop,loopEnd:source.loopEnd,rate:source.playbackRate.value,transformed:source.buffer!==audio.cache.get(descriptor.parts[index].id)}));
   const rendered=await context.startRendering(),channels=[0,1].map(ch=>rendered.getChannelData(ch).slice(lead));audio.dispose();return {channels,descriptor,sources};
  };
  const cases=[{name:'01-beginner-random',skill:10,random:true},{name:'02-trained-poor',skill:50,sliders:poor},{name:'03-trained-good',skill:50,sliders:targets},{name:'04-dry-100',skill:900/11,sliders:targets},{name:'05-bonus-110',skill:100,sliders:targets},{name:'06-beatmaking-30-good',skill:30,sound:50,sliders:targets},{name:'07-sound-10-good',skill:50,sound:10,sliders:targets}],rows=[],renders=[],files={};
  for(const item of cases){
   let state=createVirtualPcState(),metadata={skills:{beatmaking:10,sound:10}},pending=[],workLog=[];
   const audio=new BeatAudio(),play=audio.playProject.bind(audio);
   audio.playProject=(beat,options)=>{const row={stage:options?.workStage??null,profile:structuredClone(resolveBeatPlayback(beat,options).descriptor.parts.map(p=>p.result))};workLog.push(row);const promise=play(beat,options).then(ok=>{Object.assign(row,{ok,sources:audio.sources.length,ids:audio.descriptor.parts.map(p=>p.id),qualities:audio.descriptor.parts.map(p=>p.result?.quality)});return ok;});pending.push(promise);return promise;};
   const work=createBeatWorkAudio(audio),studio=mountBeatStudio(root,{getState:()=>state,getMetadata:()=>metadata,onChange:next=>{state=next;},onWork:()=>{work.sync({phase:'working',hidden:false,beat:state.projects[0],job:state.music.job});return true;},audio});
   const click=text=>{const button=[...root.querySelectorAll('button')].find(n=>n.textContent===text||n.getAttribute('aria-label')===text);if(!button)throw Error('Missing studio button: '+text);button.click();};
   const originalRandom=Math.random,originalUUID=crypto.randomUUID;Math.random=()=>.2;crypto.randomUUID=()=> 'same-authored-combo';
   try{click('Новый проект');root.querySelector('[aria-label="Название бита"]').value=item.name;click('Начать проект');}finally{Math.random=originalRandom;crypto.randomUUID=originalUUID;}
   // Identical saved composition/seed; stage work uses each case's execution skills.
   metadata={skills:{beatmaking:item.skill,sound:item.sound??item.skill}};studio.openProject(state.projects[0]);
   const stages=[];
   for(let stage=0;stage<3;stage++){
    state=restoreMusicNeeds(restoreMusicNeeds(state,'meal'),'sleep',360);studio.update();
    const sliders=[...root.querySelectorAll('input[type="range"]')];if(sliders.length!==(item.random?0:3))throw Error('Unexpected slider visibility for '+item.name);
    if(!item.random)sliders.forEach((input,index)=>{input.value=String(item.sliders[stage][index]);input.dispatchEvent(new Event('input',{bubbles:true}));});
    let randomCalls=0;Math.random=()=>[.1,.9,.7][randomCalls++%3];try{click('Работать над этапом');}finally{Math.random=originalRandom;}
    await Promise.all(pending);pending=[];await new Promise(resolve=>setTimeout(resolve,85));
    const layer=structuredClone(state.projects[0].mix.layers[stage]);stages.push({visibleSliders:sliders.length,randomCalls,jobSliders:[...state.music.job.sliders],layer,nativePosition:audio.getSnapshot().positionSeconds});
    state=advanceBeatWork(state,600).state;if(state.music.job)throw Error('Stage did not complete');work.sync({phase:'work-cover',hidden:false,beat:state.projects[0],job:null});
    state=createVirtualPcState(JSON.parse(JSON.stringify(state)));studio.update();if(JSON.stringify(layer)!==JSON.stringify(state.projects[0].mix.layers[stage]))throw Error('Saved stage result changed on completion/reload');
   }
   click('Play');await Promise.all(pending);await new Promise(resolve=>setTimeout(resolve,85));
   const finalNativePosition=audio.getSnapshot().positionSeconds,beat=structuredClone(state.projects[0]),rendered=await render(beat);renders.push(rendered.channels);files[item.name+'.wav']=wav(rendered.channels);
   const solo=[];for(let stage=0;stage<3;stage++){const part=await render(beat,stage);solo.push(part.channels);files[item.name+'-stage-'+stage+'.wav']=wav(part.channels);}
   rows.push({name:item.name,creationSkills:{beatmaking:10,sound:10},workSkills:metadata.skills,stems:rendered.descriptor.parts.map(p=>p.id),seed:beat.mix.seed,bpm:beat.bpm,duration:rendered.channels[0].length/rate,stages,nativeWorkAndStudio:workLog,finalNativePosition,sourceSchedule:rendered.sources,quality:beat.mix.layers.map(layer=>layer.quality),rms:rms(rendered.channels[0]),peak:Math.max(...rendered.channels.map(peak)),finite:rendered.channels.every(channel=>channel.every(Number.isFinite)),beat,soloRms:solo.map(channels=>rms(channels[0])),solo});
   studio.dispose();work.dispose();audio.dispose();
  }
  const dry=renders[3],dryRow=rows[3],dryBeat=dryRow.beat,decoder=new OfflineAudioContext(2,length,rate),paths=dryRow.stems.map(id=>'/assets/audio/ft/beginner-v1/'+id.replace('beginner-','').replace(/-(\d+)$/,'/$1')+'.wav');
  const originals=await Promise.all(paths.map(async path=>decoder.decodeAudioData(await(await fetch(path)).arrayBuffer()))),dryExpected=originals[0].getChannelData(0).map((_,i)=>.7*originals.reduce((sum,buffer)=>sum+buffer.getChannelData(0)[i],0));
  const differences=rows.map((row,index)=>({name:row.name,fromDryRms:difference(renders[index][0],dry[0]),soloFromDryRms:row.solo.map((channels,stage)=>difference(channels[0],dryRow.solo[stage][0]))}));
  const comparison={sameSkillsDifferentSlidersRms:difference(renders[1][0],renders[2][0]),sameGoodSlidersDifferentSkillsRms:difference(renders[2][0],renders[3][0]),beatmakingOnlyChangeRms:difference(renders[5][0],renders[2][0]),soundOnlyChangeRms:difference(renders[6][0],renders[2][0]),dryError:difference(dry[0],dryExpected),differences},legacy=[];
  for(const profile of [null,{version:1,skill:10,character:'thin'}]){
   const state=createVirtualPcState({projects:[{...dryBeat,stages:[],mix:profile??undefined}]}),next=advanceBeatWork(startBeatStage(state,dryBeat.id,[9,3,2],{beatmaking:100,sound:100}).state,600).state.projects[0],played=await render(next);
   legacy.push({profile,after:next.mix??null,result:played.descriptor.parts[0].result??null,transformed:played.sources[0].transformed});
  }
  for(const row of rows)delete row.solo;return {rows,comparison,legacy,files,storageEntries:localStorage.length};
 });
 const {rows,comparison,legacy}=result;assert.equal(result.storageEntries,0,'isolated verification must not use game saves');assert.deepEqual(errors,[]);
 for(const row of rows){
  assert.deepEqual(row.stems,['beginner-drums-04','beginner-theme-04','beginner-arrangement-04']);assert.equal(row.seed,rows[0].seed);assert.equal(row.bpm,90);assert.equal(row.duration,32/3);assert.equal(row.finite,true);assert.ok(row.peak<.981);assert.ok(row.rms>.01);assert.ok(row.finalNativePosition>0);
  assert.deepEqual(row.nativeWorkAndStudio.map(call=>call.stage),[0,1,2,null]);assert.ok(row.nativeWorkAndStudio.every(call=>call.ok));assert.deepEqual(row.nativeWorkAndStudio.map(call=>call.sources),[1,1,1,3]);
  for(let stage=0;stage<3;stage++){const part=row.stages[stage];assert.ok(part.nativePosition>0);assert.deepEqual(part.jobSliders,part.layer.sliders);assert.equal(row.nativeWorkAndStudio[stage].profile[0].quality,part.layer.quality);assert.equal(row.sourceSchedule[stage].loopEnd,32/3);assert.equal(row.sourceSchedule[stage].rate,1);}
 }
 for(const part of rows[0].stages){assert.equal(part.visibleSliders,0);assert.equal(part.randomCalls,3);assert.deepEqual(part.jobSliders,[1,9,7]);}
 assert.deepEqual(rows[3].quality,[100,100,100]);assert.deepEqual(rows[4].quality,[110,110,110]);assert.ok(comparison.sameSkillsDifferentSlidersRms>.01);assert.ok(comparison.sameGoodSlidersDifferentSkillsRms>.01);assert.ok(comparison.beatmakingOnlyChangeRms>.001);assert.ok(comparison.soundOnlyChangeRms>.001);assert.ok(comparison.dryError<1e-6);
 for(const delta of comparison.differences){if(delta.name==='04-dry-100')continue;assert.ok(delta.fromDryRms>.0001);assert.ok(delta.soloFromDryRms.every(rms=>rms>.0001),'all stages must change audibly: '+delta.name);}
 for(const row of legacy){assert.deepEqual(row.after,row.profile);assert.equal(row.result,null);assert.equal(row.transformed,false);}
 assert.deepEqual(await hashes(),before,'authored stems and original MP3 must remain byte-identical');
 for(const [name,base64]of Object.entries(result.files))await writeFile(output+'/'+name,Buffer.from(base64,'base64'));
 delete result.files;await writeFile(output+'/evidence.json',JSON.stringify({...result,originalAssetsUnchanged:true},null,2));
 const labels=['Новичок: случайные скрытые настройки','Навыки 50/50: неудачные настройки','Навыки 50/50: точные настройки','Результат 100: исходное звучание','Результат 110: творческий бонус','Битмейкинг 30, звук 50: точные настройки','Битмейкинг 50, звук 10: точные настройки'];
 await writeFile(output+'/listen.html','<!doctype html><meta charset="utf-8"><title>FT: одинаковые исходники, разные решения</title><style>body{font:17px system-ui;background:#171c24;color:#edf1f7;max-width:980px;margin:40px auto;padding:0 24px}article{background:#242c38;margin:18px 0;padding:20px;border-radius:12px}audio{display:block;width:100%;margin:12px 0}summary{cursor:pointer}small{color:#b3bdcc}</style><h1>Один бит — разные навыки и решения</h1><p>Каждый пример сделан реальными кнопками FT Studio. Одинаковые исходные слои 04/04/04, seed и темп 90 BPM. Сначала сравни варианты 2 и 3: навыки одинаковы, меняются только ползунки. Затем 3, 6 и 7: одинаковые ползунки, меняется один навык.</p>'+rows.map((row,index)=>'<article><h2>'+labels[index]+'</h2><small>Результаты слоёв: '+row.quality.join(' / ')+'; длительность 10.667 с</small><audio controls preload="none" src="'+row.name+'.wav"></audio><details><summary>Прослушать каждый этап отдельно</summary>'+['Ритм','Музыкальная основа','Аранжировка'].map((label,stage)=>'<p>'+label+'</p><audio controls preload="none" src="'+row.name+'-stage-'+stage+'.wav"></audio>').join('')+'</details></article>').join('')+'<p>Исходные WAV и MP3 не изменены. Старые проекты не получили новую обработку. Подробные данные: <a href="evidence.json">evidence.json</a>.</p>');
 console.log(JSON.stringify({output,originalAssetsUnchanged:true,cases:rows.map(({name,quality,stems,rms,peak})=>({name,quality,stems,rms,peak})),comparison,legacy}));
}finally{await browser.close();}
