import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture,completeSubmissionUpload,completeSubmissionMessage} from './helpers/submission-fixtures.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {ensureTournament} from '../src/battle-tournament.js';
import {ensureRoundTheme} from '../src/round-topics.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
import {ACK_TEMPLATES,acknowledgementFor} from '../src/social-submission.js';
import {runDemo,freshDemo,tournament,skillsAt} from './helpers/package-two-fixture.js';
import {advanceSocial} from '../src/social-runtime.js';
import {publicRoundTable} from '../src/battle-results-table.js';
import {encodePcSave,decodePcSave} from '../src/pc-save-codec.js';
import {planPostReactions,REACTION_AUTHORS} from '../src/social-reactions.js';
import {auditPackageTwo} from './helpers/package-two-audit.js';
test('50 actual productions: active judge comments use facts, no identical consecutive review and visible skill curve',()=>{const audit=auditPackageTwo();assert.equal(audit.works,50);assert.ok(audit.reviewCount>=1000);});
test('new late judge announcements do not refer to selection or already submitted tracks without facts',()=>{for(let seed=1;seed<=70;seed++){const p=planPostReactions({postId:'judge-'+seed,context:'judge-announcement',audience:100,hype:100,activeAuthors:REACTION_AUTHORS,seed,startAt:20000,eventFacts:['judge_announced'],judgeName:'Судья'});for(const c of p.comments)assert.doesNotMatch(c.body,/отбор|самому записаться|работы уже ждут|этой горы треков/i);}});
test('later-round acknowledgements never claim this work was sent to selection',()=>{for(let i=0;i<100;i++){const ack=acknowledgementFor('later-'+i,500,'round-2');assert.doesNotMatch(ACK_TEMPLATES.find(t=>t.id===ack.ackTemplateId).body,/отбор/i);}});
test('real strong production earns a final win with normal judges, frozen saves and six distinct round works',()=>{
 const {state:s,trace}=runDemo({reload:true}),t=tournament(s);assert.equal(t.status,'complete');assert.equal(t.winnerId,'player');assert.equal(t.qualifiedIds.length,32);assert.equal(t.participantIds.length,33);assert.equal(trace.length,6);assert.equal(s.battleSubmissions.length,6);assert.equal(new Set(s.battleSubmissions.map(r=>r.trackVersionId)).size,6);
 for(const r of Object.values(t.rounds)){assert.equal(r.status,'complete');assert.equal(r.completedAt,Math.max(...Object.values(r.judgeBatches).map(b=>b.publishedAt)));assert.ok(r.completedAt<=r.closesAt+2400);assert.equal(r.judgeIds.length%2,1);}
 for(let i=1;i<trace.length;i++)assert.equal(t.rounds[trace[i].roundId].opensAt,trace[i-1].completedAt+1440);
 const archived=JSON.stringify({versions:s.trackVersions,judging:s.judging,themes:s.roundThemes,history:s.battleHistory}),again=advanceSocial(createVirtualPcState(decodePcSave(encodePcSave(s))),100000).state;
 assert.equal(JSON.stringify({versions:again.trackVersions,judging:again.judging,themes:again.roundThemes,history:again.battleHistory}),archived);
 assert.ok(s.phone.queue.some(n=>n.type==='round-result'));assert.equal(advanceSocial(again,100000).events.length,0);
});
test('normal judging eliminates a failed selection and a weak new pair work without insurance',()=>{
 const weak=runDemo({skill:0,through:'selection',seed:9}).state;assert.equal(tournament(weak).qualifiedIds.includes('player'),false);assert.equal(weak.battleSubmissions.length,1);
 const pair=runDemo({skill:100,pairSkill:0,through:'round-2',seed:41}).state,r=tournament(pair).rounds['round-2'],own=r.pairs.find(p=>p.participantIds.includes('player'));assert.equal(own.technical.kind,'judged');assert.notEqual(own.winnerId,'player');assert.ok(pair.battleHistory.entries.some(e=>e.participantId==='player'&&e.status==='lost'));
});
test('PC-off catchup and stepped clocks preserve exact public events, recipes, reactions and history',()=>{
 const initial={...freshDemo(),power:'off'},end=27000,large=advanceSocial(initial,end,{heroSkills:skillsAt(10)}).state;let small=initial;
 for(let at=600;at<end;at+=360)small=advanceSocial(small,at,{heroSkills:skillsAt(10)}).state;small=advanceSocial(createVirtualPcState(small),end,{heroSkills:skillsAt(10)}).state;
 for(const key of ['tournaments','trackVersions','judging','battleHistory','roundThemes','socialReactions'])assert.deepEqual(small[key],large[key],key);
 const relevant=s=>s.socialRuntime.events.filter(e=>!e.type.startsWith('personal'));assert.deepEqual(relevant(small),relevant(large));assert.ok(relevant(large).every(e=>e.dueAt<=end));
 const early=publicRoundTable(large,{battleId:'makarevich-1',roundId:'selection',nowMinute:10680});assert.ok(!JSON.stringify(early).includes('raw'));
});
test('old-round lyric may be submitted but is never labelled as the new round topic',()=>{
 let s=ensureBattleWindow(submissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state;
 s.projects.find(p=>p.kind==='beat').recording.text.snapshot.roundId='round-2';
 s.projects.find(p=>p.kind==='beat').recording.text.snapshot.themeId='makarevich-1:round-2';
 s=completeSubmissionMessage(completeSubmissionUpload(attachSubmissionTrack(s,{communityId:'makarevich-1',projectId:'beat',nowMinute:601}).state));
 const sent=sendSubmission(s,{communityId:'makarevich-1',nowMinute:602});assert.equal(sent.ok,true,sent.reason);assert.equal(sent.state.battleSubmissions[0].topicMatch,false);
});
test('damaged published theme is quarantined through reload; never silently rerolled',()=>{
 let s=ensureTournament(ensureBattleWindow(createVirtualPcState(),{battleId:'makarevich-1',nowMinute:600}).state,{nowMinute:600}).state;
 const id='makarevich-1:selection',original={...s.roundThemes[id],closesAt:null};s.roundThemes[id]=original;
 s=createVirtualPcState(s);assert.equal(s.roundThemes[id],undefined);assert.deepEqual(s.roundThemeRecovery[0].recoveryData,original);
 s=createVirtualPcState(JSON.parse(JSON.stringify(s)));const made=ensureRoundTheme(s,{battleId:'makarevich-1',roundId:'selection',judgeIds:['eparhiya'],opensAt:600});assert.equal(made.theme,null);assert.deepEqual(made.state.roundThemeRecovery[0].recoveryData,original);
});
