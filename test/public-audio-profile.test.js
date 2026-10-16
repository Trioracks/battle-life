import test from 'node:test';
import assert from 'node:assert/strict';
import {createPcAudioSession} from '../src/pc-audio-session.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {captureTrackVersion} from '../src/track-version.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {submissionCandidates} from '../src/battle-submission.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {startSubmissionUpload,advanceSubmissionUpload} from '../src/social-upload.js';
import {sendSubmission} from '../src/social-submission.js';
import {startSubmissionMessage,advanceSubmissionMessage} from '../src/social-composer.js';
import {startTrackStudy,advanceStudy} from '../src/rap-analysis.js';
import {creativeFixture} from './helpers/creative-fixtures.js';
import {startCreativeChain,pauseCreativeChain} from '../src/creative-workflow.js';
import {advanceCreativeWork} from '../src/home-creative-work.js';
import {createBeatWorkAudio} from '../src/beat-work-audio.js';
const api=await import('../src/game-audio.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const notice='Музыка и вокал отключены в тестовой веб-версии';
const descriptor={key:'saved',owner:'export',durationSeconds:20,parts:[{id:'beginner-drums-01',loopSeconds:32/3}]};
test('public and unrecognized profiles never construct, fetch, decode, or prepare PCM',async()=>{
 assert.equal(typeof api.createGameAudio,'function');
 for(const profile of ['public-preview',undefined,'typo','']){
  const counts={factory:0,fetch:0,decode:0,worker:0,context:0};
  const audio=api.createGameAudio({profile,engineFactory:()=>{counts.factory++;throw Error('must not construct');},engineOptions:{fetchFn:()=>counts.fetch++,contextFactory:()=>{counts.context++;return {decodeAudioData:()=>counts.decode++};},pcmFactory:()=>counts.worker++}});
  assert.equal(audio.capabilities.recordedPlayback,false);assert.equal(audio.capabilities.reason,notice);assert.ok(Object.isFrozen(audio.capabilities));
  for(let i=0;i<2;i++){await audio.unlock();assert.equal(await audio.play(),false);assert.equal(await audio.playProject(submissionFixture().projects[1]),false);assert.equal(await audio.playDescriptor(descriptor),false);audio.pause();audio.stop();audio.setRoomFrame({});audio.dispose();}
  assert.deepEqual(counts,{factory:0,fetch:0,decode:0,worker:0,context:0});
  assert.deepEqual(audio.getSnapshot(),{status:'stopped',key:'',owner:null,positionSeconds:0,durationSeconds:0,error:''});assert.equal(audio.error,'');
 }
});
test('only explicit local-full constructs the existing engine with supplied options',async()=>{
 assert.equal(typeof api.createGameAudio,'function');
 const options={marker:true},calls=[],engine={play:async value=>{calls.push(value);return true;}};
 const audio=api.createGameAudio({profile:'local-full',engineOptions:options,engineFactory:given=>{assert.equal(given,options);return engine;}});
 assert.equal(audio,engine);assert.equal(await audio.play('local'),true);assert.deepEqual(calls,['local']);assert.equal(audio.capabilities.recordedPlayback,true);
});
test('idle adapters expose capability independently of owner and never claim unavailable ownership',async()=>{
 assert.equal(typeof api.createGameAudio,'function');
 const session=createPcAudioSession(api.createGameAudio()),studio=session.forOwner('studio'),social=session.forOwner('social');
 assert.equal(studio.capabilities.recordedPlayback,false);assert.equal(social.capabilities.reason,notice);assert.equal(await studio.playDescriptor(descriptor),false);assert.equal(session.isOwner('studio'),false);assert.equal(social.getSnapshot().positionSeconds,0);session.dispose();session.dispose();
});
test('unavailable playback preserves frozen recipe, export and submission score inputs',async()=>{
 assert.equal(typeof api.createGameAudio,'function');
 const run=async profile=>{
  let state=submissionFixture();const before=structuredClone(state),audio=api.createGameAudio({profile,engineFactory:()=>({playDescriptor:async()=>true,dispose(){}})});
  const captured=captureTrackVersion(state,{projectId:'beat',nowMinute:600});assert.equal(captured.ok,true);state=captured.state;
  const version=state.trackVersions.byId[captured.versionId],frozen=structuredClone(version);await audio.playDescriptor(version.recipe.descriptor);assert.deepEqual(version,frozen);assert.deepEqual(before,submissionFixture());
  const result=createAudioExport(state,{id:'preview-export',projectId:'beat',kind:'track',folderId:'exports',filename:'Работа.wav',nowMinute:600});assert.equal(result.ok,true,result.reason);
  const candidates=submissionCandidates(result.state,'makarevich-1');assert.equal(candidates[0].issue,'');
  state=ensureBattleWindow(result.state,{battleId:'makarevich-1',nowMinute:600}).state;
  const upload=startSubmissionUpload(state,{communityId:'makarevich-1',fileId:result.fileId,nowMinute:601});assert.equal(upload.ok,true,upload.reason);
  state=advanceSubmissionUpload(upload.state,{activeSeconds:2,powered:true,paused:false}).state;
  const message=startSubmissionMessage(state,{communityId:'makarevich-1',nowMinute:601});assert.equal(message.ok,true,message.reason);
  state=advanceSubmissionMessage(message.state,{activeSeconds:6,visible:true,powered:true,paused:false}).state;
  const sent=sendSubmission(state,{communityId:'makarevich-1',nowMinute:601});assert.equal(sent.ok,true,sent.reason);state=sent.state;assert.equal(state.battleSubmissions.length,1);
  state={...state,software:{...state.software,dossier:{...state.software.dossier,installed:true}},music:{...state.music,needs:{satiety:100,energy:100}}};
  const study=startTrackStudy(state,{trackVersionId:captured.versionId,nowMinute:602,heroSnapshot:{}});assert.equal(study.ok,true,study.reason);
  const studied=advanceStudy(study.state,{gameMinutes:45,nowMinute:647});assert.equal(studied.finished,true);
  audio.dispose();return {state:studied.state,candidates};
 };
 assert.deepEqual(await run('public-preview'),await run('local-full'));
});
test('public audio leaves creative start, pause, resume and completed simulation identical to local audio',async()=>{
 assert.equal(typeof api.createGameAudio,'function');
 const run=async profile=>{
  const f=creativeFixture('beat'),audio=api.createGameAudio({profile,engineFactory:()=>({playProject:async()=>true,stop(){},dispose(){}})}),work=createBeatWorkAudio(audio);
  let state=startCreativeChain(f.state,{kind:'beat',projectId:f.projectId},f.skills,()=>.4).state;
  const sync=()=>work.sync({phase:'working',hidden:false,beat:state.projects[0],job:state.music.job});
  sync();state=advanceCreativeWork(state,1,{day:1,minutes:100}).state;state=pauseCreativeChain(state);sync();
  state=startCreativeChain(state,{kind:'beat',projectId:f.projectId},f.skills,()=>.9).state;sync();
  state=advanceCreativeWork(state,24,{day:1,minutes:124}).state;sync();await Promise.resolve();
  assert.equal(state.projects[0].stages.length,3);work.dispose();audio.dispose();return state;
 };
 assert.deepEqual(await run('public-preview'),await run('local-full'));
});
