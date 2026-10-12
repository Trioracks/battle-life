import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack,sendSubmission,ACK_TEMPLATES} from '../src/social-submission.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
const options={communityId:'makarevich-1',projectId:'beat',nowMinute:601};
const ready=(o={})=>ensureBattleWindow(submissionFixture(o),{battleId:'makarevich-1',nowMinute:600}).state;
test('attach freezes personal audio without posting or consuming attempt; double send and replacement fail',()=>{
 const attached=attachSubmissionTrack(ready(),options);assert.ok(attached.ok);assert.equal(attached.state.social.personalAudioIds.length,1);assert.equal(attached.state.battleSubmissions.length,0);assert.equal(attached.state.social.posts.length,0);
 const again=attachSubmissionTrack(attached.state,options);assert.equal(again.state.social.personalAudioIds.length,1);
 const sent=sendSubmission(again.state,{communityId:'makarevich-1',nowMinute:602});assert.ok(sent.ok);
 const row=sent.state.battleSubmissions[0];assert.equal(row.version,2);assert.ok(row.ackAt-row.sentAt>=1&&row.ackAt-row.sentAt<=30);
 assert.equal(sendSubmission(sent.state,{...options,replace:true,nowMinute:603}).ok,false);
 assert.equal(attachSubmissionTrack(sent.state,options).ok,false);
 const copy=structuredClone(row);sent.state.projects[1].name='changed';assert.deepEqual(createVirtualPcState(sent.state).battleSubmissions[0],copy);
});
test('registration, playable vocal and open interval gate send, off-topic track is allowed',()=>{
 assert.equal(attachSubmissionTrack(ready({vocal:false}),options).ok,false);
 let s=attachSubmissionTrack(ready({registered:false}),options).state;assert.equal(sendSubmission(s,options).ok,false);
 s=attachSubmissionTrack(ready({battleId:null}),options).state;assert.ok(sendSubmission(s,options).ok);assert.equal(sendSubmission(s,options).state.battleSubmissions[0].topicMatch,false);
 for(const nowMinute of [599,600+7*1440,NaN,Infinity])assert.equal(sendSubmission(s,{...options,nowMinute}).ok,false);
 assert.equal(ACK_TEMPLATES.length,10);assert.equal(new Set(ACK_TEMPLATES.map(t=>t.body)).size,10);
});
test('window is saved once, odd panel and fixed schedules survive reopening',()=>{
 const s=ready(),window=structuredClone(s.battleWindows[0]);assert.equal(window.closesAt-window.opensAt,7*1440);assert.equal(window.judgeIds.length%2,1);
 assert.deepEqual(ensureBattleWindow(s,{battleId:'makarevich-1',nowMinute:99999}).state.battleWindows,[window]);
 assert.equal(ensureBattleWindow(s,{battleId:'missing',nowMinute:600}).ok,false);
});
