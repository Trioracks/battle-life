import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceJudgeClock,advanceBattleLifecycle} from '../src/battle-judging-clock.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {ensureTournament,advanceTournament} from '../src/battle-tournament.js';
import {advanceVirtualPcDurably} from '../src/virtual-pc-runtime.js';
import {activateSocial,advanceSocial} from '../src/social-runtime.js';
import {sentFixture} from './social-judging-events.test.js';
import {scheduleSubmissionJudging,publishJudgeEvents} from '../src/social-judging-events.js';
const battleId='makarevich-1';
function fixture(){let s=ensureBattleWindow(createVirtualPcState(),{battleId,nowMinute:600,judgingPolicyVersion:2}).state;s.battleWindows[0].closesAt=10680;s.battleWindows[0].deadlinePolicyVersion=1;return ensureTournament(s,{battleId,nowMinute:600}).state;}
test('clock has6quiet hours,7h3%,8h6%,distinct streams and40hguarantee; reload cannot reroll',()=>{
 const options={deadline:600,judgeIds:['a','b','c'],seed:19,roll:()=>.99999};
 const quiet=advanceJudgeClock(null,{...options,nowMinute:960});assert.deepEqual(quiet.ready,[]);
 const calls=[];const seventh=advanceJudgeClock(quiet.clock,{...options,nowMinute:1020,roll:x=>{calls.push(x);return x.judgeId==='a'?.029:.03;}});
 assert.deepEqual(seventh.ready.map(r=>r.judgeId),['a']);assert.ok(calls.every(x=>x.probability===.03));
 const eighth=advanceJudgeClock(seventh.clock,{...options,nowMinute:1080,roll:x=>{assert.equal(x.probability,.06);assert.notEqual(x.judgeId,'a');return .059;}});assert.equal(eighth.ready.length,2);
 const late=advanceJudgeClock(null,{...options,nowMinute:3000});assert.equal(late.ready.length,3);assert.ok(late.ready.every(r=>r.completedAt===3000));
 assert.equal(advanceJudgeClock(JSON.parse(JSON.stringify(late.clock)),{...options,nowMinute:9999}).ready.length,0);
 const a=advanceJudgeClock(null,{...options,roll:undefined,nowMinute:3000}),b=advanceJudgeClock(null,{...options,roll:undefined,nowMinute:3000});assert.deepEqual(a,b);assert.ok(new Set(Object.values(a.clock.completed)).size>1);
});
test('whole32work batches publish atomically; every judge is public by40h, next round by64h',()=>{
 let s=fixture(),closed=advanceTournament(s,10680).state;
 assert.equal(advanceBattleLifecycle(closed,11040).events.some(e=>e.type==='battle-judge-complete'),false);
 const done=advanceBattleLifecycle(closed,13080),round=done.state.tournaments.byId[battleId].rounds.selection;
 assert.equal(round.status,'complete');assert.equal(Object.keys(round.judgeBatches).length,5);
 for(const batch of Object.values(round.judgeBatches)){assert.equal(batch.resultIds.length,32);assert.ok(batch.publishedAt<=13080);assert.ok(batch.ltr?.trackVersionId);assert.equal(batch.ltr.judgeId,batch.judgeId);const e=done.events.find(e=>e.type==='battle-judge-complete'&&e.judgeId===batch.judgeId);assert.deepEqual(e.ltr,batch.ltr);}
 assert.equal(done.events.filter(e=>e.type==='round-result').length,1);assert.equal(done.state.tournaments.byId[battleId].nextRoundAt,round.completedAt+1440);
 const next=advanceBattleLifecycle(done.state,14520);assert.equal(next.state.tournaments.byId[battleId].currentRoundId,'round-2');
 assert.equal(advanceBattleLifecycle(createVirtualPcState(next.state),14520).events.length,0);
});
test('one large jump matches small hours and PCoff, including dependent later rounds; no future feedback',()=>{
 const s=fixture(),now=30000;const large=advanceBattleLifecycle(s,now);let small=s;
 for(let at=600;at<=now;at+=60)small=advanceBattleLifecycle(small,at).state;
 for(const key of ['tournaments','judging','battleHistory','trackVersions'])assert.deepEqual(small[key],large.state[key],key);
 assert.ok(large.events.every(e=>e.dueAt<=now));assert.equal(advanceBattleLifecycle(large.state,now-1).changed,false);
});
test('failed durable save hides both public events and internal unsuccessful hourly checks',()=>{
 let s=advanceTournament(fixture(),10680).state;const before=JSON.stringify(s);let calls=0;
 const clock={day:8,minutes:1020};const fail=advanceVirtualPcDurably(s,clock,()=>{calls++;return false;});
 assert.equal(calls,1);assert.equal(fail.saveFailed,true);assert.equal(JSON.stringify(fail.state),before);assert.deepEqual(fail.events,[]);
 const ok=advanceVirtualPcDurably(s,clock,()=>true);assert.ok(ok.state.tournaments.byId[battleId].rounds.selection.judgingClock.checkedHour>=7);
});
test('adopting an old partially published schedule preserves every old review and published timestamp',()=>{
 let s=sentFixture();const row=s.battleSubmissions[0];s=scheduleSubmissionJudging(s,row.id).state;s=publishJudgeEvents(s,11600).state;
 const archived=structuredClone(s.judging.results),oldEvents=structuredClone(s.socialRuntime.events),activation=15000;
 s=activateSocial(s,activation).state;assert.equal(s.battleWindows[0].judgingPolicyVersion,2);assert.equal(s.battleWindows[0].judgingMigration.activatedAt,activation);
 const done=advanceSocial(s,activation);assert.equal(done.state.tournaments.byId[battleId].rounds.selection.status,'complete');
 for(const [id,r]of Object.entries(archived))assert.deepEqual(done.state.judging.results[id],r);
 for(const e of oldEvents)assert.deepEqual(done.state.socialRuntime.events.find(x=>x.id===e.id),e);
 const heroEvents=done.state.socialRuntime.events.filter(e=>e.type==='judge-review'&&e.entityId===row.id);assert.equal(heroEvents.length,5);assert.equal(new Set(heroEvents.map(e=>e.resultId)).size,5);
 assert.equal(done.state.tournaments.byId[battleId].nextRoundAt,activation+1440);
});
test('damaged clock is quarantined, not rerolled or allowed to reset other PC projects',()=>{
 const s=fixture();s.projects=[{id:'kept',name:'Сохранить',type:'text',content:'текст'}];s.tournaments.byId[battleId].rounds.selection.judgingClock={checkedHour:9,completed:null};
 const loaded=createVirtualPcState(s);assert.equal(loaded.projects[0].id,'kept');assert.equal(loaded.tournaments.byId[battleId],undefined);assert.equal(loaded.tournaments.recovery.length,1);
 assert.equal(advanceBattleLifecycle(loaded,99999).changed,false);assert.equal(createVirtualPcState(loaded).tournaments.recovery.length,1);
});
