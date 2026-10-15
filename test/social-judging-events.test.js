import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleSubmissionJudging,publishJudgeEvents,publicBattleResults} from '../src/social-judging-events.js';
import {advanceSocial} from '../src/social-runtime.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
import {exportedSubmissionFixture,completeSubmissionUpload,completeSubmissionMessage} from './helpers/submission-fixtures.js';
export function sentFixture(){
 let s=ensureBattleWindow(exportedSubmissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state;
 s=attachSubmissionTrack(s,{communityId:'makarevich-1',fileId:'submission-file',nowMinute:601}).state;
 return sendSubmission(completeSubmissionMessage(completeSubmissionUpload(s)),{communityId:'makarevich-1',nowMinute:602}).state;
}
test('all judge decisions freeze once, but no public result exists before its due time',()=>{
 const s=sentFixture(),row=s.battleSubmissions[0],scheduled=scheduleSubmissionJudging(s,row.id);
 assert.equal(scheduled.ok,true);assert.equal(Object.keys(scheduled.state.judging.results).length,5);
 assert.deepEqual(scheduleSubmissionJudging(scheduled.state,row.id).state,scheduled.state);
 const w=s.battleWindows[0],early=publishJudgeEvents(scheduled.state,w.closesAt);assert.equal(early.events.length,0);assert.equal(publicBattleResults(early.state,row.id).results.length,0);
 const one=advanceSocial(early.state,w.closesAt+w.judgingOffsets[0]);assert.equal(publicBattleResults(one.state,row.id).results.length,1);assert.equal(publicBattleResults(one.state,row.id).complete,false);
});
test('PC off / large clock jump publishes each grade, one panel and batched phone; reload never regenerates',()=>{
 const s=sentFixture(),row=s.battleSubmissions[0],now=s.battleWindows[0].closesAt+4321;s.power='off';
 const done=advanceSocial(s,now),judges=done.events.filter(e=>e.type==='judge-review'),panels=done.events.filter(e=>e.type==='judge-panel-complete');
 assert.equal(judges.length,5);assert.equal(panels.length,1);assert.equal(done.state.phone.queue.filter(e=>e.type==='judge-review-batch').length,1);assert.equal(done.state.phone.queue.filter(e=>e.type==='judge-panel-complete').length,1);
 const result=publicBattleResults(done.state,row.id);assert.equal(result.complete,true);assert.equal(result.qualification,null);
 const again=advanceSocial(JSON.parse(JSON.stringify(done.state)),now+20);assert.deepEqual(again.state.judging,done.state.judging);assert.equal(again.events.length,0);assert.deepEqual(again.state.social.posts,[]);
});
