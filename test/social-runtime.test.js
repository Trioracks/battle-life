import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack,sendSubmission,dialogIsTyping,markDialogRead} from '../src/social-submission.js';
import {advanceSocial} from '../src/social-runtime.js';
import {advanceVirtualPc,advanceVirtualPcDurably} from '../src/virtual-pc-runtime.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceComputerHomeFrame} from '../src/apartment-v3-runtime.js';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {ApartmentTime} from '../src/apartment-v3-time.js';
function sentAt(end=false){
 let s=ensureBattleWindow(submissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state;
 const nowMinute=end?s.battleWindows[0].closesAt-.25:601;
 s=attachSubmissionTrack(s,{communityId:'makarevich-1',projectId:'beat',nowMinute}).state;
 return sendSubmission(s,{communityId:'makarevich-1',nowMinute}).state;
}
test('ack works with PC off; typing only last minute; reload and repeated stamp cannot duplicate',()=>{
 let s=sentAt(),r=s.battleSubmissions[0];s.power='off';
 assert.equal(dialogIsTyping(s,'makarevich-1',r.ackAt-2),false);assert.equal(dialogIsTyping(s,'makarevich-1',r.ackAt-.5),true);
 const early=advanceSocial(s,r.ackAt-.1);assert.equal(early.events.length,0);
 const clock={day:Math.floor(r.ackAt/1440)+1,minutes:r.ackAt%1440};
 const done=advanceVirtualPc(createVirtualPcState(early.state),clock);assert.equal(done.state.social.dialogs['makarevich-1'].messages.length,2);
 assert.equal(done.state.social.dialogs['makarevich-1'].unread,true);assert.equal(done.state.battleSubmissions[0].status,'accepted');
 assert.equal(advanceSocial(done.state,r.ackAt).events.length,0);assert.equal(advanceSocial(done.state,r.ackAt-2).events.length,0);
 assert.equal(markDialogRead(done.state,'makarevich-1').state.social.dialogs['makarevich-1'].unread,false);
});
test('sleep through deadline then late ack publishes once in chronological order with frozen ID',()=>{
 const s=sentAt(true),row=s.battleSubmissions[0],deadline=s.battleWindows[0].closesAt;
 assert.ok(row.ackAt>deadline);assert.equal(Object.keys(s.communityAudio??{}).length,0);
 const jump=advanceSocial(s,row.ackAt+100);assert.deepEqual(jump.events.map(e=>e.type),['submission-published','submission-ack']);
 assert.deepEqual(jump.state.communityAudio['makarevich-1'],[row.trackVersionId]);
 assert.equal(advanceSocial(createVirtualPcState(jump.state),row.ackAt+101).events.length,0);
 assert.equal(jump.state.social.dialogs['makarevich-1'].messages[0].trackVersionId,row.trackVersionId);
});
test('failed persistence publishes neither answer nor events; retry uses the original schedule',()=>{
 const s=sentAt(),row=s.battleSubmissions[0],clock={day:1,minutes:row.ackAt};let attempts=0;
 const failed=advanceVirtualPcDurably(s,clock,()=>{attempts++;return false;});
 assert.equal(attempts,1);assert.equal(failed.state,s);assert.deepEqual(failed.events,[]);assert.equal(failed.saveFailed,true);
 const saved=advanceVirtualPcDurably(failed.state,clock,()=>true);assert.equal(saved.events.length,1);assert.equal(saved.events[0].dueAt,row.ackAt);assert.equal(saved.state.battleSubmissions[0].status,'accepted');
});
test('desktop frame also waits for durable acknowledgement before updating UI state',()=>{
 const s=sentAt(),minute=s.battleSubmissions[0].ackAt;
 const motion=new ApartmentMotion({bounds:[-2,2],spawn:[0,0,.8],speed:1,doorX:0,actions:{computer:{approach:[0,0,.8],pose:[0,0,.2],yaw:0,clip:'seated',fade:false,duration:10}}});
 motion.actionId='computer';motion.startPerform();const clock=new ApartmentTime({day:1,minutes:minute});
 const frame=advanceComputerHomeFrame(motion,clock,s,0,true,()=>false);assert.equal(frame.pcState.battleSubmissions[0].status,'pending');
});
