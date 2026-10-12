import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState,applyToBattle} from '../src/virtual-pc-state.js';
import {downloadClient,downloadMetadata,openMetadata,openInstaller,advanceInstaller,advanceInstallation,pauseTransfer,resumeTransfer} from '../src/pc-software.js';
import {advanceTransfers} from '../src/pc-transfer-runtime.js';
import {SOFTWARE} from '../src/pc-software-catalog.js';
import {createLyric} from '../src/lyric-production.js';
import {createBeat} from '../src/beat-production.js';
import {startCreativeChain,pauseCreativeChain} from '../src/creative-workflow.js';
import {advanceCreativeWork} from '../src/home-creative-work.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
import {submissionCandidates} from '../src/battle-submission.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
const restore=s=>createVirtualPcState(JSON.parse(JSON.stringify(s)));
const accepted=r=>{assert.equal(r.ok,true,r.reason);return r.state;};
function install(s,id){
 s=accepted(openInstaller(s,id));for(let i=0;i<3;i++)s=accepted(advanceInstaller(s));
 s=advanceInstallation(s,SOFTWARE[id].installSeconds/2).state;
 s=advanceInstallation(restore(s),SOFTWARE[id].installSeconds/2).state;
 assert.equal(s.software[id].installed,true);return accepted(advanceInstaller(s));
}
for(const polished of [false,true])test('creation to submission '+(polished?'clean/mix/master with resumes':'draft'),()=>{
 let s=createVirtualPcState({power:'on'});
 assert.equal(s.projects.length,0);
 s=advanceTransfers(accepted(downloadClient(s)),0,10).state;s=install(s,'client');
 for(const id of ['ft','notebook'])s=accepted(openMetadata(accepted(downloadMetadata(s,id)),id));
 s=advanceTransfers(s,10,11).state;assert.equal(Object.keys(s.software.transfers).length,2);
 assert.equal(s.software.ft.receivedBytes,s.software.notebook.receivedBytes);
 s=accepted(pauseTransfer(s,'ft'));const ftBytes=s.software.ft.receivedBytes;
 s=advanceTransfers(restore(s),11,21).state;assert.equal(s.software.ft.receivedBytes,ftBytes);
 s=install(s,'notebook');s=accepted(resumeTransfer(s,'ft'));s=advanceTransfers(s,21,1021).state;s=install(s,'ft');
 s=applyToBattle(s,'makarevich-1','Сквозной тест');
 for(const kind of ['lyrics','beat']){
  s.music.needs={satiety:100,energy:100};
  s=accepted((kind==='lyrics'?createLyric:createBeat)(s,{id:kind,name:'Путь до баттла',battleId:'makarevich-1',gameDay:1},{},()=>.4));
  s=accepted(startCreativeChain(s,{kind,projectId:kind},{},()=>.4));
  const uninterrupted=advanceCreativeWork(s,24,{day:1,minutes:100}).state;
  if(polished){
   s=advanceCreativeWork(s,11,{day:1,minutes:100}).state;
   assert.equal(s.projects.find(p=>p.id===kind).stages.length,1);
   const owner=kind==='lyrics'?'writing':'music',credit=s[owner].practice;
   s=accepted(startCreativeChain(restore(pauseCreativeChain(s)),{kind,projectId:kind},{},()=>.99));
   assert.equal(s[owner].practice,credit,'resume cannot award XP');
   s=advanceCreativeWork(s,13,{day:1,minutes:200}).state;
   assert.ok(Math.abs(s[owner].practice-uninterrupted[owner].practice)<1e-9);
  }else s=uninterrupted;
  assert.equal(s.projects.find(p=>p.id===kind).status,'ready');
  assert.equal(s.projects.find(p=>p.id===kind).stages.length,3);
 }
 for(const kind of polished?['draft','clean','mix','master']:['draft']){
  s.music.needs={satiety:100,energy:100};s=accepted(startVocalWork(s,{beatId:'beat',textId:'lyrics',kind},{},()=>.4));
  const total=s.recording.job.total;s=advanceVocalWork(s,total/2).state;
  s=advanceVocalWork(restore(s),total/2).state;assert.equal(s.recording.job,null);
 }
 const seconds=submissionCandidates(s,'makarevich-1')[0].seconds;
 assert.equal(seconds,polished?64/3:32/3);
 s=accepted(ensureBattleWindow(s,{battleId:'makarevich-1',nowMinute:1440}));
 s=accepted(attachSubmissionTrack(s,{communityId:'makarevich-1',projectId:'beat',nowMinute:1441}));
 s=accepted(sendSubmission(s,{communityId:'makarevich-1',nowMinute:1442}));
 const sent=structuredClone(s.battleSubmissions[0]);assert.equal(sent.status,'pending');assert.equal(sent.topicMatch,true);
 s.projects[0].name='Позже изменено';s.projects[1].name='Другая версия';
 assert.deepEqual(restore(s).battleSubmissions[0],sent);
});
