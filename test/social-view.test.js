import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSocial} from '../src/social-view.js';
import {resolveSocialRoute} from '../src/social-routing.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {subscriptionFixture} from './helpers/social-fixtures.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {ensureSocialReactionPlans} from '../src/social-reactions.js';
import {topicFixture} from './helpers/round-topic-fixture.js';
import {gameDateTimeLabel as gameMinuteLabel} from '../src/home-calendar.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
function setup(path='me',options={}){
 const d=pcDocument(),root=d.createElement('div');let state=options.state??createVirtualPcState(),route=resolveSocialRoute('underweb://social/'+path),navigated='';
 const view=mountSocial(root,{route,getState:()=>state,getMetadata:()=>({gameDay:1,playerName:'Герой',...options.metadata}),onChange:next=>{if(options.fail)return false;state=next;return true;},navigate:url=>{navigated=url;},audio:options.audio});
 return {d,root,view,get state(){return state;},get navigated(){return navigated;}};
}
test('group navigation offers registration without changing saved battle knowledge',()=>{
 const s=setup('community/makarevich-1'),before=structuredClone(s.state.battleKnowledge);assert.equal(findButton(s.root,'Изучить площадку'),undefined);assert.ok(findButton(s.root,'Зарегистрироваться'));assert.deepEqual(s.state.battleKnowledge,before);assert.ok(!allPc(s.root).some(n=>/formatAdherence|strictnessOffset|maxPenalty/.test(n.textContent??'')));s.view.dispose();
});
test('group shows its saved deadline without a study action',()=>{
 const state=ensureBattleWindow(createVirtualPcState(),{battleId:'makarevich-1',nowMinute:600}).state;
 const s=setup('community/makarevich-1',{state,metadata:{skills:{analysis:90,intelligence:10}}});
 assert.ok(allPc(s.root).some(n=>n.textContent?.includes(gameMinuteLabel(state.battleWindows[0].closesAt))));
 assert.equal(findButton(s.root,'Изучить площадку'),undefined);s.view.dispose();
});
test('six sections show personal profile and no free wall or message composers',()=>{
 const s=setup();assert.equal(allPc(s.root).filter(n=>n.dataset?.socialSection).length,6);
 for(const text of ['Герой','День рождения','Образование','Языки','скрыто'])assert.ok(allPc(s.root).some(n=>n.textContent===text),text);
 for(const path of ['me','friends','photos','audio','messages','groups']){const x=setup(path);assert.equal(allPc(x.root).filter(n=>n.tagName==='TEXTAREA'||n.getAttribute?.('contenteditable')==='true').length,0);assert.equal(allPc(x.root).filter(n=>n.tagName==='INPUT'&&!['Поиск групп','Поиск по сообщениям'].includes(n.getAttribute('aria-label'))).length,0);x.view.dispose();}
 findButton(s.root,'Мои фотографии').click();assert.equal(s.navigated,'underweb://social/photos');s.view.dispose();
});
test('private profile route exposes neither wall nor photos and cannot add a friend',()=>{
 const s=setup('profile/sever');assert.ok(allPc(s.root).some(n=>n.textContent?.includes('Закрытый профиль')));
 assert.equal(findButton(s.root,'Добавить в друзья'),undefined);assert.ok(!allPc(s.root).some(n=>n.textContent==='Не всё, что записал, хочется сразу выкладывать.'));s.view.dispose();
});
test('group search focus stays on clock ticks, subscription is persisted before feedback',()=>{
 const s=setup('groups'),input=allPc(s.root).find(n=>n.tagName==='INPUT');input.value='велосипед';input.focus();fire(input,'input');s.view.update();
 assert.equal(s.d.activeElement,input);assert.ok(findButton(s.root,'На двух колёсах'));assert.equal(findButton(s.root,'Макаревич Battle'),undefined);s.view.dispose();
 const c=setup('community/makarevich-1');findButton(c.root,'Подписаться').click();assert.equal(c.state.social.subscriptions.length,1);assert.ok(findButton(c.root,'Вы подписаны'));c.view.dispose();
 const fail=setup('community/makarevich-1',{fail:true});findButton(fail.root,'Подписаться').click();assert.equal(fail.state.social.subscriptions.length,0);assert.ok(allPc(fail.root).some(n=>n.textContent?.includes('Не удалось сохранить')));fail.view.dispose();
});
test('saved audio catches errors without stopping the app session on page disposal',async()=>{
 let stopped=0,played=[];const audio={stop(){stopped++;},playDescriptor:async d=>{played.push(d);throw Error('network');}};
 const s=setup('audio',{state:subscriptionFixture(),audio});const b=allPc(s.root).find(n=>n.dataset?.socialAudio);b.click();await new Promise(r=>setImmediate(r));
 assert.equal(played.length,1);assert.equal(played[0].owner,'social');assert.ok(allPc(s.root).some(n=>n.textContent?.includes('Не удалось')));const before=stopped;s.view.dispose();assert.equal(stopped,before);
});

function observedPlayback(state){
 let snapshot={status:'playing',key:'version:'+state.social.personalAudioIds[0],owner:'social',positionSeconds:0,durationSeconds:20,error:''},notify=()=>{};
 return {getSnapshot:()=>snapshot,subscribe(listener){notify=listener;listener(snapshot);return ()=>{notify=()=>{};};},emit(positionSeconds){snapshot={...snapshot,positionSeconds};notify(snapshot);}};
}
function countAttributeWrites(node){
 const set=node.setAttribute.bind(node);let writes=0;node.setAttribute=(...args)=>{writes++;set(...args);};return ()=>writes;
}
test('same-page social rerenders release old audio rows before the next snapshot',()=>{
 const state=subscriptionFixture(),audio=observedPlayback(state),s=setup('audio',{state,audio});
 const old=allPc(s.root).find(n=>n.getAttribute?.('role')==='progressbar'),writes=countAttributeWrites(old);
 state.social.subscriptions.push('concrete-echo');s.view.update();const current=allPc(s.root).find(n=>n.getAttribute?.('role')==='progressbar');assert.notEqual(current,old);
 audio.emit(5);assert.equal(writes(),0);assert.equal(old.getAttribute('aria-valuenow'),'0');assert.ok(Number(current.getAttribute('aria-valuenow'))>0);s.view.dispose();
});
test('dialog history and draft replacement release only their removed audio rows',()=>{
 const state=subscriptionFixture(),id=state.social.personalAudioIds[0];state.social.dialogs['makarevich-1']={messages:[{id:'sent',sender:'player',trackVersionId:id,at:600,body:'Готово'}],draftVersionId:id};
 const audio=observedPlayback(state),s=setup('dialog/makarevich-1',{state,audio,metadata:{gameMinutes:600}}),old=allPc(s.root).filter(n=>n.getAttribute?.('role')==='progressbar'),writes=old.map(countAttributeWrites);assert.equal(old.length,2);
 state.social.dialogs['makarevich-1'].messages.push({id:'answer',sender:'organizer',at:601,body:'Ответ'});state.social.dialogs['makarevich-1'].draftVersionId='';s.view.update();audio.emit(5);
 assert.deepEqual(writes.map(count=>count()),[0,0]);for(const node of old)assert.equal(node.getAttribute('aria-valuenow'),'0');
 const current=allPc(s.root).filter(n=>n.getAttribute?.('role')==='progressbar');assert.equal(current.length,1);assert.ok(Number(current[0].getAttribute('aria-valuenow'))>0);s.view.dispose();
});

for(const label of ['Нравится','Не нравится'])test('voting keeps focus on the same post after its '+label+' count changes',()=>{
 const s=setup('community/makarevich-1',{state:ensureSocialReactionPlans(topicFixture(),13440).state,metadata:{gameMinutes:13440}}),reaction=()=>allPc(s.root).find(n=>n.dataset?.reactionPost==='announce');
 const control=findButton(reaction(),label+': 0');control.focus();control.click();const voted=findButton(reaction(),label+': 1');assert.ok(voted);assert.equal(s.d.activeElement===voted,true,'focus follows the same post and vote, not another zero-count control');assert.equal(voted.getAttribute('aria-pressed'),'true');
 voted.click();const undone=findButton(reaction(),label+': 0');assert.equal(s.d.activeElement===undone,true);assert.equal(undone.getAttribute('aria-pressed'),'false');s.view.dispose();
});

test('a scheduled background reaction count keeps focus on its original post',()=>{
 const metadata={gameMinutes:13440},s=setup('community/makarevich-1',{state:ensureSocialReactionPlans(topicFixture(),13440).state,metadata}),reaction=()=>allPc(s.root).find(n=>n.dataset?.reactionPost==='announce');
 findButton(reaction(),'Нравится: 0').focus();metadata.gameMinutes=15456;s.view.update();const updated=findButton(reaction(),'Нравится: 1');assert.ok(updated);assert.equal(s.d.activeElement===updated,true,'published ratings change the accessible count without changing focus identity');s.view.dispose();
});
