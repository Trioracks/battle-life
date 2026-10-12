import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSocial} from '../src/social-view.js';
import {resolveSocialRoute} from '../src/social-routing.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {subscriptionFixture} from './helpers/social-fixtures.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
function setup(path='me',options={}){
 const d=pcDocument(),root=d.createElement('div');let state=options.state??createVirtualPcState(),route=resolveSocialRoute('underweb://social/'+path),navigated='';
 const view=mountSocial(root,{route,getState:()=>state,getMetadata:()=>({gameDay:1,playerName:'Герой'}),onChange:next=>{if(options.fail)return false;state=next;return true;},navigate:url=>{navigated=url;},audio:options.audio});
 return {d,root,view,get state(){return state;},get navigated(){return navigated;}};
}
test('study button persists qualitative knowledge without leaking hidden coefficients',()=>{
 const s=setup('community/makarevich-1');findButton(s.root,'Изучить площадку').click();assert.equal(s.state.battleKnowledge.byRound['makarevich-1:selection'].evidence.length,1);assert.ok(allPc(s.root).some(n=>n.textContent?.includes('Уверенность: Низкая')));assert.ok(!allPc(s.root).some(n=>/formatAdherence|strictnessOffset|maxPenalty/.test(n.textContent??'')));s.view.dispose();
});
test('six sections show personal profile and no free wall or message composers',()=>{
 const s=setup();assert.equal(allPc(s.root).filter(n=>n.dataset?.socialSection).length,6);
 for(const text of ['Герой','День рождения','Образование','Языки','скрыто'])assert.ok(allPc(s.root).some(n=>n.textContent===text),text);
 for(const path of ['me','friends','photos','audio','messages','groups']){const x=setup(path);assert.equal(allPc(x.root).filter(n=>n.tagName==='TEXTAREA'||n.getAttribute?.('contenteditable')==='true').length,0);assert.equal(allPc(x.root).filter(n=>n.tagName==='INPUT'&&n.getAttribute('aria-label')!=='Поиск сообществ').length,0);x.view.dispose();}
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
test('saved audio plays one frozen version, catches errors and disposes pending playback',async()=>{
 let stopped=0,played=[];const audio={stop(){stopped++;},playDescriptor:async d=>{played.push(d);throw Error('network');}};
 const s=setup('audio',{state:subscriptionFixture(),audio});const b=allPc(s.root).find(n=>n.dataset?.socialAudio);b.click();await new Promise(r=>setImmediate(r));
 assert.equal(played.length,1);assert.equal(played[0].owner,'social');assert.ok(allPc(s.root).some(n=>n.textContent?.includes('Не удалось')));s.view.dispose();assert.ok(stopped>0);
});
