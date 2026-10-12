import test from 'node:test';
import assert from 'node:assert/strict';
import * as composer from '../src/social-composer.js';
import {submissionFixture,completeSubmissionUpload} from './helpers/submission-fixtures.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
const options={communityId:'makarevich-1',projectId:'beat',nowMinute:601};
const ready=()=>completeSubmissionUpload(attachSubmissionTrack(ensureBattleWindow(submissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state,options).state);
const tick=(s,t,extra={})=>composer.advanceSubmissionMessage(s,{activeSeconds:t,visible:true,powered:true,paused:false,...extra});
test('message uses the frozen symbolic words, original prose/verse gaps, headings and notes without regenerating',()=>{
 const s=ready(),version=s.trackVersions.byId[s.social.dialogs['makarevich-1'].draftVersionId];
 version.recipe.lyrics.sections=[{title:'Черновик',presentation:'prose',lines:[{words:[{text:'αβ.'},{text:'██'}]},{words:[{text:'γδ'}]},{gapBefore:true,words:[{text:'абв'}]}]},{title:'Куплет 2',presentation:'lines',lines:[{words:[{text:'▀▀'},{text:'▓▓.'}],note:'Старая заметка'},{gapBefore:true,indent:1,words:[{text:'<script>'}]}]}];
 const body=composer.submissionMessageBody(version);assert.ok(body.startsWith('Привет!'));assert.ok(body.includes(version.name));assert.ok(body.includes('Черновик\nαβ. ██ γδ\n\nабв'));assert.ok(body.includes('Куплет 2\n▀▀ ▓▓. // Старая заметка\n\n  <script>'));
});
test('six visible active seconds gate final send; duplicate start, hide, pause, power and reload preserve one bound composition',()=>{
 let s=ready();assert.equal(sendSubmission(s,options).ok,false);s=composer.startSubmissionMessage(s,options).state;const body=s.outgoingMessage.body;
 assert.equal(composer.startSubmissionMessage(s,options).state.outgoingMessage.body,body);
 for(const extra of [{visible:false},{powered:false},{paused:true},{activeSeconds:NaN}])assert.deepEqual(tick(s,10,extra).state,s);
 s=tick(s,2).state;s=createVirtualPcState(JSON.parse(JSON.stringify(s)));assert.equal(s.outgoingMessage.elapsedSeconds,2);s.projects=[];
 assert.equal(tick(s,3).readyToSend,false);s=tick(s,4).state;assert.equal(s.outgoingMessage.elapsedSeconds,6);assert.equal(s.outgoingMessage.body,body);
 const sent=sendSubmission(s,options);assert.ok(sent.ok);assert.equal(sent.state.outgoingMessage,null);assert.equal(sent.state.battleSubmissions.length,1);assert.equal(sent.state.social.dialogs['makarevich-1'].messages[0].body,body);assert.equal(sendSubmission(sent.state,options).ok,false);
});
test('deadline during typing retains the complete draft without consuming an attempt',()=>{
 const s=tick(composer.startSubmissionMessage(ready(),options).state,6).state;const r=sendSubmission(s,{...options,nowMinute:s.battleWindows[0].closesAt});assert.equal(r.ok,false);assert.equal(r.state.battleSubmissions.length,0);assert.equal(r.state.outgoingMessage.elapsedSeconds,6);assert.ok(r.state.social.dialogs['makarevich-1'].draftVersionId);
});
test('corrupt composer is preserved in recovery, cannot send or overwrite a frozen version',()=>{
 const s=composer.startSubmissionMessage(ready(),options).state,version=structuredClone(s.trackVersions);
 for(const patch of [{elapsedSeconds:-1},{elapsedSeconds:7},{totalSeconds:5},{body:'Другой текст'},{body:'x'.repeat(524289)},{versionId:'missing'},{communityId:'missing'}]){
  const raw={...s.outgoingMessage,...patch},bad=createVirtualPcState({...s,outgoingMessage:raw});assert.ok(bad.outgoingMessage.issue);assert.deepEqual(bad.outgoingMessage.recoveryData,raw);assert.deepEqual(createVirtualPcState(bad).outgoingMessage,bad.outgoingMessage);assert.equal(sendSubmission(bad,options).ok,false);assert.deepEqual(bad.trackVersions,version);
 }
});
