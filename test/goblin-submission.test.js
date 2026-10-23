import test from 'node:test';
import assert from 'node:assert/strict';
import {abstractRecordingFixture} from './helpers/abstract-recording-fixture.js';
import {advanceGoblin} from '../src/goblin-mentor.js';
import {exportLyricFile,sendGoblinFile,importGoblinFile} from '../src/goblin-exchange.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
import {GOBLIN_SKILLS} from '../src/goblin-catalog.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {activateSocial,advanceSocial} from '../src/social-runtime.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
import {completeSubmissionUpload,completeSubmissionMessage,exportedSubmissionFixture} from './helpers/submission-fixtures.js';
import {publicRoundTable} from '../src/battle-results-table.js';
import {advanceRoundJudging} from '../src/battle-judging-clock.js';
const battle='makarevich-1',next=r=>{assert.equal(r.ok,true,r.reason);return r.state;},restore=s=>createVirtualPcState(JSON.parse(JSON.stringify(s)));
function send(state,fileId,at=6641){
 let s=next(attachSubmissionTrack(state,{communityId:battle,fileId,nowMinute:at}));
 s=completeSubmissionMessage(completeSubmissionUpload(s),{nowMinute:at});
 return next(sendSubmission(s,{communityId:battle,nowMinute:at}));
}
test('mentor text, beat, player vocal and returned mix reach acknowledgement and real judging after reload',()=>{
 let s=next(activateSocial(abstractRecordingFixture({experimentalLead:true}),1502));
 for(const app of ['client','ft','notebook'])s.software[app].installed=true;
 s=advanceGoblin(s,1502).state;s.social.goblin.stage='text';
 s=next(exportLyricFile(s,'lyrics',1600));s=next(sendGoblinFile(s,s.social.goblin.files[0].id,1600));
 s=advanceGoblin(restore(s),1620).state;s=next(importGoblinFile(s,'goblin-return-text',1620));
 s=next(createAudioExport(s,{id:'test-beat',projectId:'beat',kind:'beat',folderId:'exports',filename:'beat',nowMinute:1630}));
 s=next(sendGoblinFile(s,'test-beat',1630));s=advanceGoblin(restore(s),1650).state;s=next(importGoblinFile(s,'goblin-return-beat',1650));
 const beatId=s.social.goblin.received['goblin-return-beat'],textId=s.social.goblin.received['goblin-return-text'];
 s.music.needs={satiety:100,energy:100};s=next(startVocalWork(s,{beatId,textId},GOBLIN_SKILLS,()=>.2));s=advanceVocalWork(s,1000).state;
 s=next(createAudioExport(s,{id:'test-track',projectId:beatId,kind:'track',folderId:'exports',filename:'voice',nowMinute:6000}));
 s=next(sendGoblinFile(s,'test-track',6000));s=advanceGoblin(restore(s),6020).state;s=next(importGoblinFile(s,'goblin-return-track',6020));
 const file=s.audioExports.files.find(f=>f.id==='received-goblin-return-track');
 s=restore(send(restore(s),file.id));const row=s.battleSubmissions[0];
 s=advanceSocial(s,row.ackAt).state;assert.equal(s.battleSubmissions[0].status,'accepted');
 assert.equal(s.social.dialogs[battle].messages.filter(m=>m.kind==='ack').length,1);
 s=advanceSocial(restore(s),11583).state;assert.equal(s.tournaments.byId[battle].rounds.selection.submissions.player,file.trackVersionId);
 s=advanceSocial(restore(s),14000).state;assert.equal(s.tournaments.byId[battle].rounds.selection.status,'complete');
 assert.equal(Object.values(s.judging.results).filter(r=>r.trackVersionId===file.trackVersionId).length,5);
 assert.notEqual(publicRoundTable(s,{battleId:battle,nowMinute:14000}).rows.find(r=>r.participantId==='player').status,'no_show');
});
test('an awaiting saved round reconciles a real timely submission rather than keeping a stale no-show',()=>{
 const sent=send(next(activateSocial(exportedSubmissionFixture(),1502)),'submission-file'),row=sent.battleSubmissions[0],deadline=sent.battleWindows[0].closesAt;
 // Reproduce the reported inconsistent snapshot: the immutable sent row and
 // dialog exist, while the closed tournament snapshot omitted the player.
 const stale=advanceSocial({...sent,battleSubmissions:[]},deadline+1).state;
 const saved=restore({...stale,battleSubmissions:sent.battleSubmissions,social:sent.social});
 assert.equal(saved.tournaments.byId[battle].rounds.selection.submissions.player,undefined);
 const recovered=advanceSocial(saved,deadline+2);assert.equal(recovered.reason,undefined);
 const s=recovered.state;assert.equal(s.battleSubmissions[0].status,'accepted');
 assert.equal(s.tournaments.byId[battle].rounds.selection.submissions.player,row.trackVersionId);
 assert.equal(s.battleHistory.entries.some(e=>e.participantId==='player'&&e.roundId==='selection'&&e.status==='no_show'),false);
 assert.equal(s.social.dialogs[battle].messages.filter(m=>m.kind==='ack').length,1);
 const repeat=advanceSocial(restore(s),deadline+3).state;assert.equal(repeat.social.dialogs[battle].messages.filter(m=>m.kind==='ack').length,1);
});
test('a judging failure cannot roll back an independent administrator acknowledgement',()=>{
 const sent=send(next(activateSocial(exportedSubmissionFixture(),1502)),'submission-file'),deadline=sent.battleWindows[0].closesAt;
 let s=advanceSocial({...sent,battleSubmissions:[]},1503).state;
 s={...s,battleSubmissions:sent.battleSubmissions,social:sent.social};
 s.tournaments.byId[battle].rounds.selection.judgeIds=['missing-saved-judge'];
 const result=advanceSocial(s,deadline+2400);
 assert.equal(result.state.battleSubmissions[0].status,'accepted');
 assert.equal(result.state.social.dialogs[battle].messages.filter(m=>m.kind==='ack').length,1);
 assert.match(result.warning,/состав судей/);
});
test('recovery adds the missing work to already published judge batches without duplicate reviews',()=>{
 const sent=send(next(activateSocial(exportedSubmissionFixture(),1502)),'submission-file'),row=sent.battleSubmissions[0],deadline=sent.battleWindows[0].closesAt;
 let stale=advanceSocial({...sent,battleSubmissions:[]},deadline).state;
 const first=stale.tournaments.byId[battle].rounds.selection.judgeIds[0];
 stale=advanceRoundJudging(stale,{roundId:'selection',nowMinute:deadline+420,roll:({judgeId})=>judgeId===first?0:1}).state;
 assert.equal(Object.keys(stale.tournaments.byId[battle].rounds.selection.judgeBatches).length,1);
 let s=advanceSocial(restore({...stale,battleSubmissions:sent.battleSubmissions,social:sent.social}),deadline+421).state;
 assert.equal(Object.values(s.judging.results).filter(r=>r.trackVersionId===row.trackVersionId&&r.judgeId===first).length,1);
 s=advanceSocial(restore(s),deadline+2400).state;
 assert.equal(s.tournaments.byId[battle].rounds.selection.status,'complete');
 assert.equal(Object.values(s.judging.results).filter(r=>r.trackVersionId===row.trackVersionId).length,5);
});
test('recovery refuses late, unavailable and wrong-round submissions',()=>{
 const sent=send(next(activateSocial(exportedSubmissionFixture(),1502)),'submission-file'),row=sent.battleSubmissions[0],deadline=sent.battleWindows[0].closesAt;
 const stale=advanceSocial({...sent,battleSubmissions:[]},deadline).state;
 for(const patch of [{sentAt:deadline},{trackVersionId:'unavailable'},{roundId:'round-2'},{status:'recovery'}]){
  const input=structuredClone({...stale,battleSubmissions:[{...row,...patch}]});
  assert.equal(advanceSocial(input,deadline+1).state.tournaments.byId[battle].rounds.selection.submissions.player,undefined,JSON.stringify(patch));
 }
});
test('table cannot declare a no-show before the background domain closes the round',()=>{
 const sent=send(next(activateSocial(exportedSubmissionFixture(),1502)),'submission-file'),deadline=sent.battleWindows[0].closesAt;
 const s=advanceSocial(sent,6700).state;
 const table=publicRoundTable(s,{battleId:battle,nowMinute:deadline+1});
 assert.notEqual(table.rows.find(r=>r.participantId==='player').status,'no_show');
 assert.match(table.message,/Обрабатываем/);
});
