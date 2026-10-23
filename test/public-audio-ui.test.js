import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {createPcAudioSession} from '../src/pc-audio-session.js';
import {mountBeatStudio} from '../src/beat-studio-view.js';
import {createSocialAudio} from '../src/social-audio-view.js';
import {createBeatMarket} from '../src/beat-market-view.js';
import {mountAudioFilePlayer,mountAudioExport} from '../src/pc-audio-export-view.js';
import {createBeatWorkAudio} from '../src/beat-work-audio.js';
import {createBeatWorkPanel} from '../src/beat-work-view.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {ensureNpcRoundTrack} from '../src/battle-npc.js';
import {DEMO_PARTICIPANTS} from '../src/battle-demo-config.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {creativeFixture} from './helpers/creative-fixtures.js';
const notice='Музыка и вокал отключены в тестовой веб-версии';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const calls={play:0,unlock:0},audio={capabilities:Object.freeze({recordedPlayback:false,reason:notice}),play:async()=>{calls.play++;return false;},playProject:async()=>{calls.play++;return false;},playDescriptor:async()=>{calls.play++;return false;},unlock:async()=>calls.unlock++,stop(){},pause(){},dispose(){},getSnapshot:()=>({status:'stopped',key:'',owner:null,positionSeconds:0,durationSeconds:0,error:''})};
 const session=createPcAudioSession(audio),d=pcDocument(),root=d.createElement('div');return {calls,audio,session,d,root};
}
const hasNotice=root=>allPc(root).some(n=>n.textContent===notice);
test('studio disables recorded transport while project creation and ready export remain available',()=>{
 const {session,root,calls}=fixture();let state=submissionFixture();
 const view=mountBeatStudio(root,{getState:()=>state,getMetadata:()=>({skills:{}}),onChange:s=>state=s,audio:session.forOwner('studio'),initialProject:state.projects.find(p=>p.id==='beat')});
 assert.equal(allPc(root).find(n=>n.dataset.ftAction==='play').disabled,true);assert.equal(hasNotice(root),true);assert.equal(findButton(root,'Экспорт').disabled,false);assert.notEqual(findButton(root,'Новый проект').disabled,true);assert.equal(calls.play,0);view.dispose();session.dispose();
});
test('idle social row stays stopped with study available',async()=>{
 const {session,d,calls}=fixture(),view=createSocialAudio(session.forOwner('social'),{onAnalyze(){}}),version={id:'saved',name:'Запись',schemaVersion:1,recipe:{dspVersion:1,descriptor:{durationSeconds:20,parts:[]}}};
 const row=view.row(d,{version}),play=allPc(row).find(n=>n.dataset.socialAudio);assert.equal(play.disabled,true);assert.equal(hasNotice(row),true);assert.notEqual(findButton(row,'Изучить трек · 45 мин').disabled,true);play.click();await flush();assert.equal(calls.play,0);assert.equal(allPc(row).find(n=>n.getAttribute('role')==='progressbar').getAttribute('aria-valuenow'),'0');view.dispose();session.dispose();
});
test('market and RIPLINE show public notice and disable only recorded listening',()=>{
 for(const ripline of [false,true]){const {audio,d,session}=fixture(),root=createBeatMarket(d,{getState:()=>submissionFixture(),onChange(){},audio,navigate(){},ripline});assert.equal(hasNotice(root),true);assert.equal(allPc(root).filter(n=>n.tagName==='BUTTON'&&n.textContent==='▶ Слушать').length,0,'the released catalog is intentionally empty');assert.notEqual(findButton(root,ripline?'Установить RIPLINE':'Открыть RIPLINE').disabled,true);session.dispose();}
});
test('export player avoids autoplay and shows notice while export creation stays enabled',async()=>{
 const {audio,session,root,calls}=fixture(),state=submissionFixture(),result=createAudioExport(state,{id:'export',projectId:'beat',kind:'track',folderId:'exports',filename:'Трек.wav',nowMinute:600});assert.equal(result.ok,true);
 const view=mountAudioFilePlayer(root,{audio});view.open(result.state.audioExports.files[0]);view.update();await flush();assert.equal(findButton(root,'▶ Слушать файл').disabled,true);assert.equal(hasNotice(root),true);assert.equal(calls.play,0);
 const form=mountAudioExport(root,{getState:()=>state,projectId:'beat',onCommit:()=>true});assert.notEqual(findButton(root,'Экспортировать').disabled,true);form.dispose();view.dispose();session.dispose();
});
test('public work never starts or retries audio across hidden frames and reports contextual notice',async()=>{
 const {audio,session,d,calls}=fixture(),work=createBeatWorkAudio(audio),frame={phase:'working',hidden:false,beat:{id:'beat'},job:{beatId:'beat',stage:0,elapsed:5,total:10}};
 for(const hidden of [false,true,false])assert.deepEqual(work.sync({...frame,hidden}),{audioError:'',needsGesture:false,audioNotice:notice});assert.equal(await work.enableAudio(),false);assert.deepEqual(calls,{play:0,unlock:0});
 const panel=createBeatWorkPanel(d);panel.update({...frame,...work.sync(frame)});assert.equal(hasNotice(panel.element),true);assert.equal(findButton(panel.element,'Включить звук').hidden,true);assert.equal(allPc(panel.element).find(n=>n.dataset.workRole==='progress').value,.5);panel.dispose();work.dispose();work.dispose();session.dispose();
});
test('public NPC full track and beat-only preview both remain disabled with no synthetic progress',async()=>{
 const {session,d,calls}=fixture(),npc=ensureNpcRoundTrack(createVirtualPcState(),{characterId:DEMO_PARTICIPANTS[0].characterId,battleId:'makarevich-1',roundId:'selection',nowMinute:600}),version=npc.state.trackVersions.byId[npc.trackVersionId],view=createSocialAudio(session.forOwner('social'));
 const complete=view.row(d,{version}),fullPlay=allPc(complete).find(n=>n.dataset.socialAudio===version.id);assert.equal(fullPlay.disabled,true);fullPlay.click();await flush();assert.equal(calls.play,0);assert.equal(hasNotice(complete),true);assert.equal(allPc(complete).find(n=>n.getAttribute('role')==='progressbar').getAttribute('aria-valuenow'),'0');
 // Historical frozen work without a cleared vocal remains a beat-only preview.
 version.npc.audioStatus='awaiting-voice';version.npc.voiceId='npc-voice:'+version.npc.characterId;version.recipe.descriptor.parts=version.recipe.descriptor.parts.filter(p=>!p.vocal);version.npc.requiredAssets=version.npc.requiredAssets.map(a=>a.kind==='vocal'?{...a,id:'npc-take:'+version.npc.characterId+':selection',voiceId:version.npc.voiceId}:a);
 const row=view.row(d,{version}),preview=findButton(row,'Предпросмотр бита — без голоса');assert.ok(preview);assert.equal(preview.disabled,true);preview.click();await flush();assert.equal(calls.play,0);assert.equal(hasNotice(row),true);assert.equal(allPc(row).find(n=>n.getAttribute('role')==='progressbar').getAttribute('aria-valuenow'),'0');view.dispose();session.dispose();
});
test('production desktop defaults to public recorded capability while preserving its procedural cue engine',()=>{
 const d=pcDocument(),root=d.createElement('div'),pc=mountVirtualPc(root);assert.equal(pc.beatAudio.capabilities.recordedPlayback,false);assert.equal(pc.audioSession.forOwner('underweb').capabilities.reason,notice);assert.equal(typeof pc.audio.playBoot,'function');pc.dispose();
});
test('starting creative work and vocal post work stays usable without requesting recorded sound preparation',()=>{
 for(const action of ['beat','vocal']){
  const {audio,session,root,calls}=fixture(),f=creativeFixture('beat');let state=action==='beat'?f.state:submissionFixture();state.music.needs={satiety:100,energy:100};
  const view=mountBeatStudio(root,{getState:()=>state,getMetadata:()=>({skills:f.skills}),onChange:s=>state=s,audio,initialProject:state.projects.find(p=>p.kind==='beat')});
  const start=findButton(root,action==='beat'?'Работать над битом':'Свести');assert.ok(start);assert.notEqual(start.disabled,true);start.click();assert.ok(action==='beat'?state.music.job:state.recording.job);assert.deepEqual(calls,{play:0,unlock:0});view.dispose();session.dispose();
 }
});
