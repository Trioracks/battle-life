import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureTournament,advanceTournament,completeTournamentRound,normalizeTournaments} from '../src/battle-tournament.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {createVirtualPcState,applyToBattle} from '../src/virtual-pc-state.js';
import {exportedSubmissionFixture,completeSubmissionUpload,completeSubmissionMessage} from './helpers/submission-fixtures.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
import {createSocialCommunityView} from '../src/social-community-view.js';
import {subscribeCommunity} from '../src/social-state.js';
import {pcDocument,findButton,allPc} from './helpers/virtual-pc-dom.js';
const battleId='makarevich-1';
function fresh(){let s=applyToBattle(createVirtualPcState(),battleId,'Игрок');s=ensureBattleWindow(s,{battleId,nowMinute:600}).state;return ensureTournament(s,{battleId,nowMinute:600,heroSkills:{writing:40,musicality:40,flow:40,beatmaking:40,sound:40}}).state;}
const tournament=s=>s.tournaments.byId[battleId];
function closed(){const s=fresh();return advanceTournament(s,10080).state;}
function selection(s){const t=tournament(s),r=t.rounds.selection,gradesById=Object.fromEntries(Object.keys(r.submissions).map((id,i)=>[id,Array(5).fill(9-(i%10)*.5)]));return completeTournamentRound(s,{battleId,roundId:'selection',completedAt:13080,gradesById});}
test('selection closes once, freezes32real NPC works and records player no-show without a zero track',()=>{
 const s=fresh();assert.equal(tournament(s).rounds.selection.closesAt,10080);
 const first=advanceTournament(s,10080);assert.equal(tournament(first.state).rounds.selection.status,'awaiting_judges');assert.equal(Object.keys(tournament(first.state).rounds.selection.submissions).length,32);
 assert.equal(tournament(first.state).rounds.selection.submissions.player,undefined);assert.ok(first.state.battleHistory.entries.some(e=>e.participantId==='player'&&e.status==='no_show'));
 const loaded=createVirtualPcState(JSON.parse(JSON.stringify(first.state))),again=advanceTournament(loaded,10080);assert.equal(again.events.length,0);assert.deepEqual(again.state.trackVersions,first.state.trackVersions);
});
test('published selection seeds once; next round opens at midnight after at least24h for exactly7days and no-show snapshot never rerolls',()=>{
 const completed=selection(closed());assert.equal(completed.ok,true,completed.reason);let s=completed.state;const t=tournament(s);assert.equal(t.qualifiedIds.length,32);assert.equal(t.nextRoundAt,15840);
 assert.equal(advanceTournament(s,15839).state.tournaments.byId[battleId].rounds['round-2'],undefined);
 s=advanceTournament(s,15840,{heroSkills:{writing:42,musicality:42,flow:42,beatmaking:42,sound:42}}).state;
 const round=tournament(s).rounds['round-2'];assert.equal(round.closesAt-round.opensAt,10080);assert.equal(round.pairs.length,16);
 const before=structuredClone(round),again=advanceTournament(createVirtualPcState(s),15841,{heroSkills:{writing:100,musicality:100,flow:100,beatmaking:100,sound:100}});assert.deepEqual(tournament(again.state).rounds['round-2'],before);
 assert.equal(completeTournamentRound(s,{battleId,roundId:'selection',completedAt:13080,gradesById:{}}).ok,false);
});
test('double no-show eliminates both, carries an empty fixed slot, and records history after reload',()=>{
 let s=advanceTournament(selection(closed()).state,15840).state,t=tournament(s),round=t.rounds['round-2'],pair=round.pairs[0];
 for(const id of pair.participantIds)round.noShows[id].misses=true;
 s=advanceTournament(s,round.closesAt).state;t=tournament(s);const closedRound=t.rounds['round-2'];assert.equal(closedRound.pairs[0].technical.kind,'double_no_show');
 const winners=Object.fromEntries(closedRound.pairs.filter(p=>p.technical.kind==='judged').map(p=>[p.nodeId,p.participantIds[0]]));
 const done=completeTournamentRound(s,{battleId,roundId:'round-2',completedAt:closedRound.closesAt+2400,winnersByNode:winners});assert.equal(done.ok,true,done.reason);
 s=createVirtualPcState(done.state);for(const id of pair.participantIds){assert.ok(s.battleHistory.entries.some(e=>e.participantId===id&&e.roundId==='round-2'&&e.status==='no_show'));assert.ok(s.battleHistory.entries.some(e=>e.participantId===id&&e.roundId==='round-2'&&e.status==='eliminated'));}
 const announced=advanceTournament(s,tournament(s).nextRoundAt).state,next=tournament(announced).rounds['round-3'];assert.equal(next.pairs[0].participantIds[0],null);assert.deepEqual(next.pairs[0].participantIds,tournament(announced).bracket.rounds[1][0].participantIds);
});
test('legacy published player grades survive adoption; damaged tournament is recoverable, never reset',()=>{
 const s=fresh();s.judging={results:{old:{id:'old',grade:3.5,raw:3.3}},history:[]};const before=JSON.stringify(s.judging);assert.equal(JSON.stringify(advanceTournament(s,10080).state.judging),before);
 const bad=normalizeTournaments({byId:{[battleId]:{policyVersion:99,raw:'keep'}}});assert.equal(bad.recovery[0].recoveryData.raw,'keep');
 assert.equal(ensureTournament({...s,tournaments:bad},{battleId,nowMinute:600}).ok,false);
});
test('hero can upload/type/send a second round after reload; previous upload cannot cross a RoundKey',()=>{
 const subscribed=subscribeCommunity(exportedSubmissionFixture(),battleId,true,{nowMinute:600});assert.equal(subscribed.ok,true,subscribed.reason);
 let s=ensureBattleWindow(subscribed.state,{battleId,nowMinute:600}).state;
 s=completeSubmissionUpload(attachSubmissionTrack(s,{communityId:battleId,fileId:'submission-file',nowMinute:601}).state);s=completeSubmissionMessage(s);
 let sent=sendSubmission(s,{communityId:battleId,nowMinute:601});assert.equal(sent.ok,true,sent.reason);s=ensureTournament(sent.state,{battleId,nowMinute:601}).state;s=advanceTournament(s,10080).state;
 const gradesById=Object.fromEntries(Object.keys(tournament(s).rounds.selection.submissions).map(id=>[id,Array(5).fill(id==='player'?10:5)]));
 s=completeTournamentRound(s,{battleId,roundId:'selection',completedAt:13080,gradesById}).state;s=advanceTournament(s,15840).state;s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
 assert.equal(s.battleWindows.find(w=>w.roundId==='round-2').issue,undefined,'new window survives normalizer');
 const uploaded=attachSubmissionTrack(s,{communityId:battleId,fileId:'submission-file',nowMinute:15841});assert.equal(uploaded.ok,true,uploaded.reason);s=completeSubmissionUpload(uploaded.state);s=createVirtualPcState(s);
 assert.equal(s.outgoingUpload.issue,undefined);assert.equal(s.outgoingUpload.windowId,'makarevich-1:round-2:1');
 s=completeSubmissionMessage(s,{nowMinute:15842});s=createVirtualPcState(s);assert.equal(s.outgoingMessage.issue,undefined);
 const stale=structuredClone(s);stale.outgoingUpload.windowId='makarevich-1:selection:1';assert.equal(sendSubmission(stale,{communityId:battleId,nowMinute:15842}).ok,false);
 sent=sendSubmission(s,{communityId:battleId,nowMinute:15842});assert.equal(sent.ok,true,sent.reason);assert.equal(sent.state.battleSubmissions.length,2);assert.equal(sent.state.battleSubmissions[1].roundId,'round-2');
 assert.equal(createVirtualPcState(sent.state).battleSubmissions[1].issue,undefined);assert.equal(attachSubmissionTrack(sent.state,{communityId:battleId,fileId:'submission-file',nowMinute:15843}).ok,false);
 assert.equal(sendSubmission(s,{communityId:battleId,nowMinute:25920}).ok,false,'deadline is exclusive');
 const d=pcDocument(),root=createSocialCommunityView(d,{id:battleId,getState:()=>s,getMetadata:()=>({gameMinutes:15842}),navigate:()=>{},commit:()=>{},audio:{row:()=>d.createElement('div')}});
 assert.equal(findButton(root,'Сдать трек').disabled,false,'community uses the second round deadline');
 assert.ok(allPc(root).some(n=>n.textContent?.includes('19.09.2012 00:00')),'current round date is shown');
 const eliminated=structuredClone(s);eliminated.tournaments.byId[battleId].rounds['round-2'].pairs.forEach(p=>p.participantIds=p.participantIds.map(id=>id==='player'?null:id));
 assert.equal(attachSubmissionTrack(eliminated,{communityId:battleId,fileId:'submission-file',nowMinute:15842}).ok,false,'eliminated hero cannot submit');
});
