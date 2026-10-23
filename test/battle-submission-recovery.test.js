import test from 'node:test';
import assert from 'node:assert/strict';
import {runDemo,produceDemoTrack,submitDemoTrack,BATTLE} from './helpers/package-two-fixture.js';
import {advanceSocial} from '../src/social-runtime.js';
import {advanceRoundJudging} from '../src/battle-judging-clock.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';

test('timely paired submission recovery repairs the published technical review and completes judging',()=>{
 let state=runDemo({through:'selection'}).state;
 state=advanceSocial(state,state.tournaments.byId[BATTLE].nextRoundAt).state;
 const opened=state.tournaments.byId[BATTLE].rounds['round-2'];
 const pair=opened.pairs.find(p=>p.participantIds.includes('player'));
 assert.ok(pair,'the submitted selection entry must qualify for a real paired round');
 const opponentId=pair.participantIds.find(id=>id!=='player');
 const made=produceDemoTrack(state,{roundId:'round-2',nowMinute:opened.opensAt+1});
 state=submitDemoTrack(made.state,made.beatId,opened.opensAt+2);
 const submissions=state.battleSubmissions;
 const submitted=submissions.find(row=>row.roundId==='round-2');

 // The durable row survives, but a stale closing snapshot omitted it and a
 // judge has already reviewed the opponent as a technical no-show winner.
 state=advanceSocial({...state,battleSubmissions:submissions.filter(row=>row!==submitted)},opened.closesAt).state;
 const closed=state.tournaments.byId[BATTLE].rounds['round-2'],judgeId=closed.judgeIds[0];
 const first=advanceRoundJudging(state,{roundId:'round-2',nowMinute:opened.closesAt+420,roll:({judgeId:id})=>id===judgeId?0:1});
 assert.equal(first.reason,undefined);
 state=first.state;
 const batch=state.tournaments.byId[BATTLE].rounds['round-2'].judgeBatches[judgeId];
 const opponentVersionId=closed.submissions[opponentId];
 const originalReview=Object.values(state.judging.results).find(r=>r.roundId==='round-2'&&r.judgeId===judgeId&&r.trackVersionId===opponentVersionId);
 assert.equal(originalReview.decision.kind,'grade');
 assert.equal(originalReview.opponentTrackVersionId,null);
 const unrelated=batch.resultIds.map(id=>state.judging.results[id]).find(r=>r.id!==originalReview.id);
 assert.ok(unrelated,'a real unrelated pair provides an immutable review to preserve');

 state=createVirtualPcState(JSON.parse(JSON.stringify({...state,battleSubmissions:submissions})));
 const repaired=advanceSocial(state,opened.closesAt+421);
 assert.equal(repaired.warning,undefined);
 state=repaired.state;
 const recovered=state.tournaments.byId[BATTLE].rounds['round-2'];
 assert.equal(recovered.submissions.player,submitted.trackVersionId);
 assert.equal(recovered.pairs.find(p=>p.participantIds.includes('player')).technical.kind,'judged');
 const revised=state.judging.results[originalReview.id];
 assert.equal(revised.opponentTrackVersionId,submitted.trackVersionId,'the old technical review must evaluate the recovered opponent');
 assert.equal(revised.decision.kind,'pair_vote');
 assert.deepEqual(state.judging.results[unrelated.id],unrelated,'unrelated published reviews must not be rerolled');
 assert.equal(recovered.judgeBatches[judgeId].publishedAt,batch.publishedAt);
 assert.equal(state.judging.history.filter(r=>r.id===originalReview.id).length,1,'history must not keep a stale technical review beside its replacement');
 assert.deepEqual(state.judging.history.find(r=>r.id===originalReview.id),revised);

 const completed=advanceSocial(state,opened.closesAt+2400);
 assert.equal(completed.warning,undefined);
 state=completed.state;
 assert.equal(state.tournaments.byId[BATTLE].rounds['round-2'].status,'complete');
 const own=Object.values(state.judging.results).filter(r=>r.roundId==='round-2'&&r.trackVersionId===submitted.trackVersionId);
 assert.equal(own.length,closed.judgeIds.length);
 assert.ok(own.every(r=>r.decision.kind==='pair_vote'));
 const restored=createVirtualPcState(JSON.parse(JSON.stringify(state)));
 const repeated=advanceSocial(restored,opened.closesAt+2401);
 assert.equal(repeated.warning,undefined);
 assert.equal(Object.values(repeated.state.judging.results).filter(r=>r.roundId==='round-2'&&r.trackVersionId===submitted.trackVersionId).length,closed.judgeIds.length);
 assert.deepEqual(repeated.state.judging,restored.judging,'reload must not duplicate or regenerate the repaired panel');
});
