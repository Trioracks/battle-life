import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSocialDialog} from '../src/social-dialog-view.js';
import {exportedSubmissionFixture,completeSubmissionUpload} from './helpers/submission-fixtures.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack} from '../src/social-submission.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {pcDocument,findButton,allPc} from './helpers/virtual-pc-dom.js';
function fixture(){
 const d=pcDocument();let state=completeSubmissionUpload(attachSubmissionTrack(ensureBattleWindow(exportedSubmissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state,{communityId:'makarevich-1',fileId:'submission-file',nowMinute:601}).state),visible=true,fail=false,failCheckpoint=false,writes=0,attemptWrites=0,minute=601,view;
 const mount=()=>view=mountSocialDialog(d,{id:'makarevich-1',getState:()=>state,getMetadata:()=>({gameMinutes:minute,playerName:'Герой'}),navigate(){},isVisible:()=>visible,audio:{row:()=>d.createElement('div')},commit:r=>{if(!r.ok)return false;writes++;if(failCheckpoint)return false;if(r.state.battleSubmissions.length>state.battleSubmissions.length){attemptWrites++;if(fail)return false;}state=createVirtualPcState(r.state);view?.update();return true;}});mount();
 return {get view(){return view},get state(){return state},get writes(){return writes},get attempts(){return attemptWrites},mount,setVisible:v=>visible=v,setFail:v=>fail=v,setFailCheckpoint:v=>failCheckpoint=v,setMinute:v=>minute=v};
}

test('failed typing checkpoint does not retry on hidden or paused frames before explicit retry',()=>{
 const f=fixture();findButton(f.view.root,'Отправить').click();f.setFailCheckpoint(true);f.view.tickOutgoingMessage(1,{paused:false});const writes=f.writes;
 assert.equal(f.state.outgoingMessage.elapsedSeconds,0);f.setVisible(false);
 for(let i=0;i<120;i++){f.view.tickOutgoingMessage(0,{paused:i%2===0});f.view.update();}
 assert.equal(f.writes,writes);assert.equal(f.state.battleSubmissions.length,0);f.setVisible(true);f.view.tickOutgoingMessage(10,{paused:true});assert.equal(f.writes,writes);
 f.setFailCheckpoint(false);findButton(f.view.root,'Повторить отправку').click();assert.equal(f.state.outgoingMessage.elapsedSeconds,1);f.view.tickOutgoingMessage(5,{paused:false});assert.equal(f.state.battleSubmissions.length,1);f.view.dispose();
});
test('UI types over six visible seconds, flushes before hiding, resumes and sends full body only once',()=>{
 const f=fixture();findButton(f.view.root,'Отправить').click();assert.equal(f.state.battleSubmissions.length,0);f.view.tickOutgoingMessage(2,{paused:false});f.view.tickOutgoingMessage(.3,{paused:false});assert.equal(f.state.outgoingMessage.elapsedSeconds,2);
 f.setVisible(false);f.view.update();assert.equal(f.state.outgoingMessage.elapsedSeconds,2.3);f.view.tickOutgoingMessage(100,{paused:false});assert.equal(f.state.battleSubmissions.length,0);f.view.dispose();f.mount();f.setVisible(true);f.view.tickOutgoingMessage(3.7,{paused:false});assert.equal(f.state.battleSubmissions.length,1);assert.equal(f.attempts,1);assert.ok(f.state.social.dialogs['makarevich-1'].messages[0].body.startsWith('Привет!'));f.view.tickOutgoingMessage(100,{paused:false});assert.equal(f.attempts,1);f.view.dispose();
});
test('failed final write retains a completed composer and draft, blocks automatic retry; explicit retry does not retype',()=>{
 const f=fixture();findButton(f.view.root,'Отправить').click();f.setFail(true);f.view.tickOutgoingMessage(6,{paused:false});assert.equal(f.state.outgoingMessage.elapsedSeconds,6);assert.equal(f.state.battleSubmissions.length,0);assert.ok(f.state.social.dialogs['makarevich-1'].draftVersionId);assert.equal(f.attempts,1);
 f.view.tickOutgoingMessage(100,{paused:false});assert.equal(f.attempts,1);f.view.dispose();f.mount();f.view.tickOutgoingMessage(100,{paused:false});assert.equal(f.attempts,1);
 f.setFail(false);findButton(f.view.root,'Повторить отправку').click();assert.equal(f.state.battleSubmissions.length,1);assert.equal(f.attempts,2);f.view.dispose();
});
test('expiry during UI typing keeps completed draft, displays failure and renders text as text',()=>{
 const f=fixture();findButton(f.view.root,'Отправить').click();f.view.tickOutgoingMessage(5,{paused:false});f.setMinute(f.state.battleWindows[0].closesAt);f.view.tickOutgoingMessage(1,{paused:false});assert.equal(f.state.battleSubmissions.length,0);assert.equal(f.state.outgoingMessage.elapsedSeconds,6);assert.ok(allPc(f.view.root).some(n=>n.textContent?.includes('Приём работ закрыт')));assert.equal(allPc(f.view.root).some(n=>n.tagName==='TEXTAREA'),false);f.view.dispose();
});
