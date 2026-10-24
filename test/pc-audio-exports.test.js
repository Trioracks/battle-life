import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState,VIRTUAL_PC_STORAGE_KEY,diskUsage} from '../src/virtual-pc-state.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
import {captureTrackVersion} from '../src/track-version.js';
import {createSocialBackground} from '../src/social-background.js';
import {createSocialWorkerRuntime} from '../src/social-worker-runtime.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
import {advanceExportJobDurably,advanceExportJob} from '../src/pc-export-job.js';
const api=await import('../src/pc-audio-exports.js').catch(()=>({}));
const views=await import('../src/pc-audio-export-view.js').catch(()=>({}));
const options={id:'export-1',projectId:'beat',kind:'track',folderId:'exports',filename:'Работа.wav',nowMinute:600};
function exportFile(state,overrides={}){assert.equal(typeof api.createAudioExport,'function','audio export command exists');return api.createAudioExport(state,{...options,...overrides});}
function memory(){return {data:new Map(),getItem(k){return this.data.get(k)??null;},setItem(k,v){this.data.set(k,v);}};}
function withAlternates(){let s=submissionFixture();s.projects.find(p=>p.id==='beat').recording.draft.seed=15;s.music.needs={satiety:100,energy:100};return advanceVocalWork(startVocalWork(s,{beatId:'beat',kind:'mix'},{},()=>.4).state,1000).state;}

test('three exports keep the saved descriptor, all alternative windows and calibration',()=>{
 const original=withAlternates(),before=structuredClone(original),descriptor=resolveBeatPlayback(original.projects.find(p=>p.id==='beat')).descriptor;
 assert.ok(descriptor.parts.some(p=>p.songSection));assert.ok(descriptor.parts.findIndex(p=>p.vocal)>3,'vocal is after alternate parts');
 for(const kind of ['beat','vocal','track']){
  const r=exportFile(original,{kind});assert.equal(r.ok,true,r.reason);assert.equal(r.fileId,'export-1');
  const file=r.state.audioExports.files[0],expected=structuredClone(descriptor);
  expected.parts=descriptor.parts.filter(p=>kind==='track'||(kind==='vocal'?!!p.vocal:!p.vocal));
  assert.deepEqual(file.descriptor,expected);assert.equal(file.bytes,3763244);assert.equal(file.createdAtMinute,600);
  assert.equal(file.folderId,'exports');assert.equal(file.filename,'Работа.wav');assert.equal(file.projectId,'beat');assert.equal(file.kind,kind);
  assert.ok(file.sourceRevision.beat);assert.equal('pcm' in file,false);
  if(kind==='track'){
   const captured=captureTrackVersion(original,{projectId:'beat',nowMinute:600});
   assert.equal(file.trackVersionId,captured.versionId);assert.deepEqual(r.state.trackVersions.byId[file.trackVersionId],captured.state.trackVersions.byId[captured.versionId]);
  }else assert.equal(file.trackVersionId,null);
 }
 assert.deepEqual(original,before,'export does not mutate editable input');
});

test('ready instrumental exports without vocal; vocal and full explain the missing take',()=>{
 const s=submissionFixture({vocal:false});assert.equal(exportFile(s,{kind:'beat'}).ok,true);
 for(const kind of ['vocal','track']){const r=exportFile(s,{kind});assert.equal(r.ok,false);assert.match(r.reason,/вокал|запис/);assert.equal(r.state,s);}
 const unfinished=structuredClone(s);unfinished.projects.find(p=>p.id==='beat').stages.pop();
 assert.equal(exportFile(unfinished,{kind:'beat'}).ok,false);
});

test('editing or deleting a project cannot change saved exports or track versions after reload',()=>{
 let state=withAlternates();for(const kind of ['beat','vocal','track'])state=exportFile(state,{kind,id:kind,filename:kind}).state;
 const files=structuredClone(state.audioExports),versions=structuredClone(state.trackVersions);
 state.projects.find(p=>p.id==='beat').recording.draft.seed++;state.projects.find(p=>p.id==='beat').mix.layers[0].quality=100;
 state.projects=[];state.music.practice=100;state.phonePresentation={firstWakeAtMinute:12,announcedIds:['kept']};
 const storage=memory();assert.equal(saveVirtualPcState(storage,state),true);const loaded=loadVirtualPcState(storage);assert.equal(loaded.ok,true);
 assert.deepEqual(loaded.state.audioExports,files);assert.deepEqual(loaded.state.trackVersions,versions);assert.deepEqual(loaded.state.phonePresentation,state.phonePresentation);
 assert.ok(JSON.stringify(loaded.state.audioExports).length<188164,'three descriptors occupy less than one tenth of one WAV, without PCM');
});

test('unsafe names, destinations, time and ids fail without changing the input',()=>{
 const state=submissionFixture(),before=structuredClone(state);
 for(const change of [{filename:'../bad.wav'},{filename:'C:\\bad.wav'},{filename:'CON.wav'},{filename:'bad?.wav'},{filename:'bad. '},{filename:''},{filename:'song.mp3'},{folderId:'windows'},{folderId:'C:\\Windows'},{nowMinute:-1},{id:''},{kind:'project'}]){
  const r=exportFile(state,change);assert.equal(r.ok,false,JSON.stringify(change));assert.equal(r.state,state);assert.ok(r.reason);
 }
 for(const folderId of ['documents','music','exports','downloads','projects']){const r=exportFile(state,{folderId,filename:'Мой трек'});assert.equal(r.ok,true,r.reason);assert.equal(r.state.audioExports.files[0].filename,'Мой трек.wav');}
 assert.deepEqual(state,before);
});

test('completed WAV filenames enforce the same length boundary before save and after reload',()=>{
 const state=submissionFixture({vocal:false});
 for(const [filename,ok]of [
  ['а'.repeat(116),true],['а'.repeat(117),false],['а'.repeat(118),false],['а'.repeat(119),false],['а'.repeat(120),false],
  ['а'.repeat(116)+'.wav',true],['а'.repeat(117)+'.wav',false],
 ]){
  const result=exportFile(state,{kind:'beat',filename});assert.equal(result.ok,ok,'input length '+filename.length);
  if(!ok){assert.equal(result.state,state);continue;}
  assert.equal(result.state.audioExports.files[0].filename.length,120);
  const storage=memory();assert.equal(saveVirtualPcState(storage,result.state),true);const loaded=loadVirtualPcState(storage);assert.equal(loaded.ok,true);
  assert.deepEqual(loaded.state.audioExports,result.state.audioExports);assert.equal(loaded.state.audioExports.files.length,1);assert.deepEqual(loaded.state.audioExports.recovery,[]);
 }
});

test('case-insensitive filename and id collisions never overwrite previous files',()=>{
 const first=exportFile(submissionFixture()).state,before=structuredClone(first);
 for(const change of [{id:'second',filename:'работа.WAV'},{filename:'other.wav'}]){const r=exportFile(first,change);assert.equal(r.ok,false);assert.match(r.reason,/существ|занят/);assert.equal(r.state,first);}
 assert.equal(exportFile(first,{id:'second',folderId:'music'}).ok,true,'same name in another folder is distinct');
 const p=structuredClone(first);p.projects.push({id:'named-project',name:'reserved.wav'});
 assert.equal(exportFile(p,{id:'third',folderId:'projects',filename:'RESERVED.wav'}).ok,false);
 assert.deepEqual(first,before);
});

test('WAV byte accounting reserves stereo 44.1kHz 16-bit size and rejects a full disk',()=>{
 let s=submissionFixture();s.projects.push(...Array.from({length:997},(_,i)=>({id:'filler-'+i})));
 const before=diskUsage(s).usedMb,r=exportFile(s);assert.equal(r.ok,true,r.reason);
 assert.equal(r.state.audioExports.files[0].bytes,1881644);assert.ok(Math.abs(diskUsage(r.state).usedMb-before-1.881644)<1e-9);
 const rejected=exportFile(r.state,{id:'second',filename:'second'});assert.equal(rejected.ok,false);assert.match(rejected.reason,/мест/);assert.equal(rejected.state,r.state);
});

test('normalization quarantines damaged descriptors, bytes, missing versions and duplicate files without rewriting valid snapshots',()=>{
 const r=exportFile(withAlternates()),valid=r.state.audioExports.files[0],bad={...structuredClone(valid),id:'broken',descriptor:{...valid.descriptor,parts:[]}};
 const raw={version:1,files:[valid,bad,{...valid,id:'size',bytes:12},{...valid,id:'missing',trackVersionId:'lost'},{...valid,id:'duplicate',filename:'работа.WAV'}],recovery:[{id:'old',reason:'kept',recoveryData:{x:1}}]};
 const normalized=api.normalizeAudioExports(raw,r.state.trackVersions);assert.deepEqual(normalized.files,[valid]);assert.equal(normalized.recovery.length,5);
 assert.deepEqual(normalized.recovery[1].recoveryData,bad);assert.deepEqual(api.normalizeAudioExports(normalized,r.state.trackVersions),normalized);
 const clone=api.normalizeAudioExports({version:1,files:[valid]},r.state.trackVersions);clone.files[0].descriptor.parts[0].windows[0].sourceBar=99;
 assert.notEqual(valid.descriptor.parts[0].windows[0].sourceBar,99);
});

test('stem normalization quarantines unknown or retired sources and preserves supported legacy recipes',()=>{
 const state=submissionFixture();
 for(const [kind,sourceId]of [['beat','does-not-exist'],['beat','free-01'],['vocal','vocal-999']]){
  const file=structuredClone(exportFile(state,{kind}).state.audioExports.files[0]);file.descriptor.parts[0].id=sourceId;
  const result=api.normalizeAudioExports({version:1,files:[file],recovery:[]},state.trackVersions);
  assert.equal(result.files.length,0,kind+' source '+sourceId);assert.equal(result.recovery.length,1);assert.deepEqual(result.recovery[0].recoveryData,file);
 }
 for(const sourceId of ['primitive','melody','bass','beginner-drums-01','beginner-theme-01','beginner-arrangement-01','user-drums-20261012-01']){
  const file=structuredClone(exportFile(state,{kind:'beat'}).state.audioExports.files[0]);file.descriptor.parts=[{id:sourceId,loopSeconds:16/3}];
  const result=api.normalizeAudioExports({version:1,files:[file],recovery:[]},state.trackVersions);
  assert.deepEqual(result.files,[file],sourceId);assert.deepEqual(result.recovery,[]);
 }
 for(const sourceId of ['vocal-01','vocal-54']){
  const file=structuredClone(exportFile(state,{kind:'vocal'}).state.audioExports.files[0]);file.descriptor.parts[0].id=sourceId;
  assert.deepEqual(api.normalizeAudioExports({version:1,files:[file]},state.trackVersions).files,[file],sourceId);
 }
});

test('failed export persistence leaves saved bytes, files and versions unchanged and permits retry',()=>{
 const storage=memory(),initial=submissionFixture();initial.software.ft.installed=true;assert.equal(saveVirtualPcState(storage,initial),true);
 const previousSavedBytes=structuredClone([...storage.data]),document=pcDocument(),root=document.createElement('section');let reject=true;
 const write=storage.setItem.bind(storage);storage.setItem=(k,v)=>{if(reject)throw Error('quota');write(k,v);};
 const pc=mountVirtualPc(root,{onPersist:(next,options)=>saveVirtualPcState(storage,next)});
 pc.showDesktop(initial);pc.openNow('ft-studio');pc.studioView.openProject(initial.projects.find(p=>p.id==='beat'));
 findButton(root,'Экспорт').click();findButton(root,'Экспортировать').click();findButton(allPc(root).find(n=>n.getAttribute?.('aria-label')==='Сохранить как'),'Сохранить').click();
 assert.deepEqual([...storage.data],previousSavedBytes);assert.equal(pc.state.audioExports.files.length,0);assert.equal(Object.keys(pc.state.trackVersions.byId).length,0);
 assert.ok(allPc(root).some(n=>/Не удалось сохранить/.test(n.textContent??'')));
 reject=false;findButton(allPc(root).find(n=>n.getAttribute?.('aria-label')==='Сохранить как'),'Сохранить').click();assert.equal(pc.state.audioExports.files.length,0);assert.ok(pc.state.exportJob);
 const result=advanceExportJobDurably(pc.state,{activeSeconds:5,visible:true,powered:true},next=>pc.persist(next,{atomic:true}));assert.ok(result.completedFileId);assert.equal(pc.state.audioExports.files.length,1);assert.equal(loadVirtualPcState(storage).state.audioExports.files.length,1);pc.dispose();
});

test('export form retains focused name and folder while host state updates',()=>{
 assert.equal(typeof views.mountAudioExport,'function');const document=pcDocument(),root=document.createElement('div');let state=submissionFixture({vocal:false});
 const view=views.mountAudioExport(root,{getState:()=>state,projectId:'beat',getMetadata:()=>({gameDay:1,gameMinutes:600}),onCommit:next=>{state=next;return true;},onClose(){}});
 findButton(root,'Экспортировать').click();const name=allPc(root).find(n=>n.getAttribute('aria-label')==='Имя файла'),folder=allPc(root).find(n=>n.getAttribute('aria-label')==='Папка файла');name.value='Личное имя';folder.value='music';folder.dispatchEvent(new Event('change'));name.focus();
 state={...state,lastGameMinute:601};view.update();assert.equal(document.activeElement,name);assert.equal(name.value,'Личное имя');assert.equal(folder.value,'music');
 findButton(root,'Сохранить').click();assert.equal(state.audioExports.files.length,0);state=advanceExportJob(state,{activeSeconds:5,visible:true,powered:true}).state;view.update();assert.equal(state.audioExports.files[0].filename,'Личное имя.wav');assert.equal(state.audioExports.files[0].folderId,'music');view.dispose();
});

test('late Worker merges retain new exports, presentation and current unrelated state',()=>{
 let state=submissionFixture({vocal:false}),worker;const calculate=createSocialWorkerRuntime();
 const background=createSocialBackground({getState:()=>state,createWorker:()=>worker={postMessage(m){this.request=structuredClone(m);},terminate(){}},persist:()=>true,onState:next=>state=next});
 background.tick(600,{},0);state=exportFile(state,{kind:'beat'}).state;const exports=state.audioExports,presentation={version:1,firstWakeAtMinute:0,announcedIds:['new']};state={...state,phonePresentation:presentation,lastGameMinute:620};
 worker.onmessage({data:calculate(worker.request)});assert.equal(state.audioExports,exports);assert.equal(state.phonePresentation,presentation);assert.equal(state.lastGameMinute,620);assert.ok(state.socialRuntime.events.length);background.dispose();
});

test('export timestamps consume the host absolute minute without adding the day twice',()=>{
 const document=pcDocument(),root=document.createElement('div');let state=submissionFixture({vocal:false});
 const view=views.mountAudioExport(root,{getState:()=>state,projectId:'beat',getMetadata:()=>({gameDay:2,gameMinutes:1500}),onCommit:next=>{state=next;return true;}});
 findButton(root,'Экспортировать').click();findButton(root,'Сохранить').click();state=advanceExportJob(state,{activeSeconds:5,visible:true,powered:true}).state;assert.equal(state.audioExports.files[0].createdAtMinute,1500);view.dispose();
});

test('an unreadable file collection is retained in recovery instead of silently discarded',()=>{
 const raw={version:1,files:{lost:{filename:'keep.wav'}},recovery:[]};
 const normalized=api.normalizeAudioExports(raw,{byId:{}});assert.equal(normalized.files.length,0);assert.deepEqual(normalized.recovery[0].recoveryData,raw.files);
 assert.deepEqual(api.normalizeAudioExports(normalized,{byId:{}}),normalized);
});
