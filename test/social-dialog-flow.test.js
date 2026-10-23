import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSocialDialog} from '../src/social-dialog-view.js';
import {mountGoblinDialog} from '../src/goblin-dialog-view.js';
import {mountPersonalDialog} from '../src/social-messages-view.js';
import {advanceGoblin,replyToGoblin} from '../src/goblin-mentor.js';
import {GOBLIN_ID} from '../src/goblin-catalog.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack} from '../src/social-submission.js';
import {markDialogRead} from '../src/social-submission.js';
import {exportLyricFile} from '../src/goblin-exchange.js';
import {completeSubmissionUpload,exportedSubmissionFixture} from './helpers/submission-fixtures.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';

const field=root=>allPc(root).find(n=>n.getAttribute('aria-label')==='Сообщение');
function layoutDocument(){
 const d=pcDocument(),create=d.createElement;
 d.createElement=tag=>{const n=create(tag);n.scrollTop=0;n.clientHeight=200;Object.defineProperty(n,'scrollHeight',{get:()=>n.children.length*100});return n;};return d;
}
function goblin(initial,minute=20){
 const d=layoutDocument();let state=initial??advanceGoblin(advanceGoblin(createVirtualPcState({power:'on'}),0).state,20).state,view,visible=true,paused=false;
 const mount=()=>view=mountGoblinDialog(d,{getState:()=>state,getMetadata:()=>({gameMinutes:minute,playerName:'Герой'}),isVisible:()=>visible,navigate(){},audio:{releaseRows(){}},commit:r=>{if(!r.ok)return false;state=createVirtualPcState(r.state);view?.update(false);return true;}});mount();
 return {get view(){return view},get state(){return state},set state(v){state=v;},d,mount,setVisible:v=>visible=v,tick:t=>view.tickOutgoingMessage(t,{paused}),setPaused:v=>paused=v,setMinute:v=>minute=v};
}

test('Goblin answer selection types a durable draft and requires a separate send click',()=>{
 const f=goblin(),before=f.state.social.dialogs[GOBLIN_ID].messages.length;
 const answer=findButton(f.view.root,'Ответить');assert.ok(answer);answer.click();
 findButton(f.view.root,'Хорошо! Сам как?').click();
 assert.equal(f.state.social.goblin.stage,'hello');assert.equal(f.state.social.dialogs[GOBLIN_ID].messages.length,before);
 assert.equal(findButton(f.view.root,'Отправить').disabled,true);assert.equal(field(f.view.root).readOnly,true);
 f.tick(1);assert.ok(field(f.view.root).value.length>0);assert.notEqual(field(f.view.root).value,'Хорошо! Сам как?');
 f.setVisible(false);f.tick(20);assert.equal(f.state.social.dialogs[GOBLIN_ID].replyDraft.elapsedSeconds,1);
 f.view.dispose();f.mount();f.setVisible(true);f.tick(20);
 assert.equal(field(f.view.root).value,'Хорошо! Сам как?');assert.equal(f.state.social.dialogs[GOBLIN_ID].messages.length,before);
 findButton(f.view.root,'Отправить').click();assert.equal(f.state.social.goblin.stage,'invite-wait');assert.equal(f.state.social.dialogs[GOBLIN_ID].messages.length,before+1);assert.equal(f.state.social.dialogs[GOBLIN_ID].replyDraft,null);f.view.dispose();
});

test('Goblin mood wait reports real queued game time and reveals the real invite choices',()=>{
 let state=advanceGoblin(advanceGoblin(createVirtualPcState({power:'on'}),0).state,20).state;
 state=advanceGoblin(replyToGoblin(state,'good',20).state,30).state;const f=goblin(state,30);
 assert.ok(allPc(f.view.root).some(n=>n.textContent?.includes('через 10 игровых минут')));
 assert.equal(findButton(f.view.root,'Ответить').disabled,true);
 f.state=advanceGoblin(f.state,60).state;f.setMinute(60);f.view.update();findButton(f.view.root,'Ответить').click();assert.ok(findButton(f.view.root,'О, круто! А чё дальше?'));f.view.dispose();
});

test('Goblin typing batches checkpoints and flushes fractional progress when hidden',()=>{
 const f=goblin();findButton(f.view.root,'Ответить').click();findButton(f.view.root,'Хорошо! Сам как?').click();
 f.tick(.25);assert.equal(f.state.social.dialogs[GOBLIN_ID].replyDraft.elapsedSeconds,0);assert.ok(field(f.view.root).value.length>0);
 f.setVisible(false);f.view.update();assert.equal(f.state.social.dialogs[GOBLIN_ID].replyDraft.elapsedSeconds,.25);
 f.setVisible(true);f.setPaused(true);f.tick(30);assert.equal(f.state.social.dialogs[GOBLIN_ID].replyDraft.elapsedSeconds,.25);f.view.dispose();
});

test('Goblin retries unread persistence after reopening instead of treating a failed write as read',()=>{
 let state=advanceGoblin(advanceGoblin(createVirtualPcState({power:'on'}),0).state,20).state,visible=true,saved=false;
 const d=pcDocument(),view=mountGoblinDialog(d,{getState:()=>state,getMetadata:()=>({gameMinutes:20,playerName:'Герой'}),navigate(){},isVisible:()=>visible,audio:{releaseRows(){}},commit:()=>false,onRead:id=>{if(saved)state=markDialogRead(state,id).state;}});
 view.update();assert.equal(state.social.dialogs[GOBLIN_ID].unread,true);visible=false;view.update();saved=true;visible=true;view.update();assert.equal(state.social.dialogs[GOBLIN_ID].unread,false);view.dispose();
});

test('Goblin attachment chooser prepares the actual exported text and sends only on request',()=>{
 let state=advanceGoblin(exportedSubmissionFixture(),0).state;state.social.goblin.stage='text';const exported=exportLyricFile(state,'lyrics',20);assert.equal(exported.ok,true);state=exported.state;
 const f=goblin(state),before=f.state.social.dialogs[GOBLIN_ID].messages.length;findButton(f.view.root,'Прикрепить').click();findButton(f.view.root,'Выбрать вложение').click();
 assert.equal(f.state.social.goblin.sent.text,undefined);assert.equal(f.state.social.dialogs[GOBLIN_ID].messages.length,before);f.tick(3);assert.equal(field(f.view.root).value,'Чувак, вот мой текст. Глянешь?');assert.equal(f.state.social.goblin.stage,'text');
 findButton(f.view.root,'Отправить').click();assert.equal(f.state.social.goblin.stage,'waiting-text');assert.equal(f.state.social.goblin.sent.text,exported.fileId);assert.equal(f.state.social.dialogs[GOBLIN_ID].messages.length,before+1);assert.equal(f.state.social.goblin.pending.find(m=>m.id==='return:text').at,40);f.view.dispose();
});

test('incoming history preserves the prepared draft and composer focus while reading older messages',()=>{
 const f=goblin();f.state=structuredClone(f.state);for(let i=0;i<8;i++)f.state.social.dialogs[GOBLIN_ID].messages.unshift({id:'older-'+i,sender:GOBLIN_ID,at:i,body:'История'});f.view.update();
 findButton(f.view.root,'Ответить').click();findButton(f.view.root,'Хорошо! Сам как?').click();f.tick(1);
 const input=field(f.view.root),history=allPc(f.view.root).find(n=>n.className==='sn-dialog-history'),before=structuredClone(f.state.social.dialogs[GOBLIN_ID].replyDraft);history.scrollTop=30;fire(history,'scroll');input.focus();
 f.state=structuredClone(f.state);f.state.social.dialogs[GOBLIN_ID].messages.push({id:'new-incoming',sender:GOBLIN_ID,at:21,body:'Новое сообщение'});f.view.update();
 assert.deepEqual(f.state.social.dialogs[GOBLIN_ID].replyDraft,before);assert.equal(history.scrollTop,30);assert.equal(f.d.activeElement,input);assert.equal(findButton(f.view.root,'К новым сообщениям ↓').hidden,false);f.view.dispose();
});

test('history starts at bottom, retains manual reading on incoming and jumps after an own send',()=>{
 const d=layoutDocument();let state=createVirtualPcState(),view;
 const mount=()=>view=mountPersonalDialog(d,{id:'vitya',getState:()=>state,getMetadata:()=>({playerName:'Герой'}),navigate(){},commit:r=>{state=r.state;return true;}});mount();
 const history=allPc(view.root).find(n=>n.className==='sn-dialog-history');assert.equal(history.scrollTop,history.scrollHeight-history.clientHeight);
 history.scrollTop=25;fire(history,'scroll');
 state=structuredClone(state);state.social.dialogs.vitya.messages.push({id:'incoming',sender:'vitya',body:'Новое',at:610});view.update();
 assert.equal(history.scrollTop,25);const jump=findButton(view.root,'К новым сообщениям ↓');assert.equal(jump.hidden,false);jump.click();assert.equal(history.scrollTop,history.scrollHeight-history.clientHeight);
 history.scrollTop=25;fire(history,'scroll');state=structuredClone(state);state.social.dialogs.vitya.messages.push({id:'outgoing',sender:'player',body:'Ответ',at:611});view.update();assert.equal(history.scrollTop,history.scrollHeight-history.clientHeight);view.dispose();
});

test('community prepares its frozen submission text without sending until the separate click',()=>{
 const d=layoutDocument();let state=completeSubmissionUpload(attachSubmissionTrack(ensureBattleWindow(exportedSubmissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state,{communityId:'makarevich-1',fileId:'submission-file',nowMinute:601}).state),view;
 view=mountSocialDialog(d,{id:'makarevich-1',getState:()=>state,getMetadata:()=>({gameMinutes:601,playerName:'Герой'}),navigate(){},audio:{row:()=>d.createElement('div')},commit:r=>{if(!r.ok)return false;state=createVirtualPcState(r.state);view?.update(false);return true;}});
 findButton(view.root,'Ответить').click();findButton(view.root,'Отправить работу на баттл').click();view.tickOutgoingMessage(6,{paused:false});
 assert.equal(state.battleSubmissions.length,0);assert.equal(state.outgoingMessage.elapsedSeconds,6);assert.ok(field(view.root).value.startsWith('Привет!'));
 findButton(view.root,'Отправить').click();assert.equal(state.battleSubmissions.length,1);assert.equal(state.outgoingMessage,null);view.dispose();
});
