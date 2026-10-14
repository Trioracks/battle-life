import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSocial} from '../src/social-view.js';
import {resolveSocialRoute} from '../src/social-routing.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advancePersonalDialogs,unreadDialogCount} from '../src/social-personal.js';
import {hoverPhoneNotice} from '../src/phone-notifications.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
function setup(path='messages',initial=createVirtualPcState()){
 const d=pcDocument(),root=d.createElement('main');let state=initial,visible=true,saved=true,address='';
 const view=mountSocial(root,{route:resolveSocialRoute('underweb://social/'+path),getState:()=>state,getMetadata:()=>({gameMinutes:601,playerName:'Герой'}),onChange:next=>{if(!saved)return false;state=next;return true;},navigate:url=>address=url,isVisible:()=>visible});
 return {root,d,view,get state(){return state;},set state(s){state=s;},set visible(v){visible=v;},set saved(v){saved=v;},get address(){return address;}};
}
test('messages search names and history, folds case/yo, keeps input focus on time ticks',()=>{
 const s=setup(),input=allPc(s.root).find(n=>n.getAttribute('aria-label')==='Поиск по сообщениям');assert.ok(input);
 input.value='ВИТЯ';input.focus();fire(input,'input');assert.ok(findButton(s.root,'Витя Кольцов'));assert.equal(findButton(s.root,'Анна Лесная'),undefined);
 input.value='вЕРНу';fire(input,'input');assert.ok(findButton(s.root,'Витя Кольцов'));s.view.update();assert.equal(s.d.activeElement,input);
 input.value='увидимся еще';fire(input,'input');assert.ok(findButton(s.root,'Анна Лесная'));findButton(s.root,'Анна Лесная').click();assert.equal(s.address,'underweb://social/dialog/anya');s.view.dispose();
});
test('personal histories have dates and no track submission or reply composer',()=>{
 for(const id of ['anya','dasha','vitya']){const s=setup('dialog/'+id);assert.ok(allPc(s.root).some(n=>n.textContent?.includes(id==='anya'?'2011':'2012')));assert.equal(findButton(s.root,'Прикрепить'),undefined);assert.equal(findButton(s.root,'Отправить'),undefined);assert.equal(allPc(s.root).some(n=>n.tagName==='TEXTAREA'),false);if(id==='vitya')assert.ok(findButton(s.root,'Заблокировать и удалить из друзей'));s.view.dispose();}
});
test('the whole dialog row is a native keyboard button including avatar and preview',()=>{
 const s=setup(),row=allPc(s.root).find(n=>n.className?.split(' ').includes('sn-message-row')&&n.getAttribute('aria-label')==='Анна Лесная');assert.ok(row);assert.equal(row.tagName,'BUTTON');assert.ok(allPc(row).some(n=>n.className==='sn-avatar'));assert.ok(allPc(row).some(n=>n.tagName==='P'));assert.equal(allPc(row).filter(n=>n.tagName==='BUTTON').length,1);row.click();assert.equal(s.address,'underweb://social/dialog/anya');s.view.dispose();
});
test('badge counts dialogs, visible reads only after save, hidden and phone-dismiss do not read',()=>{
 let state=advancePersonalDialogs(createVirtualPcState(),3480).state;const list=setup('messages',state);assert.ok(allPc(list.root).some(n=>n.className==='sn-unread-badge'&&n.textContent==='+1'));
 const id=state.phone.activeId;state.phone=hoverPhoneNotice(hoverPhoneNotice(state.phone,id,true),id,false);assert.equal(unreadDialogCount(state),1);
 const s=setup('dialog/vitya',state);s.visible=false;s.view.update();assert.equal(s.state.social.dialogs.vitya.unread,true);s.visible=true;s.saved=false;s.view.update();assert.equal(s.state.social.dialogs.vitya.unread,true);
 s.visible=false;s.view.update();s.saved=true;s.visible=true;s.view.update();assert.equal(s.state.social.dialogs.vitya.unread,false);s.view.dispose();list.view.dispose();
});
test('blocking confirmation is shown only after durable save and history is retained',()=>{
 const s=setup('dialog/vitya'),before=s.state.social.dialogs.vitya.messages;s.saved=false;findButton(s.root,'Заблокировать и удалить из друзей').click();assert.equal(s.state.social.blockedProfileIds.includes('vitya'),false);
 s.saved=true;findButton(s.root,'Заблокировать и удалить из друзей').click();assert.ok(s.state.social.blockedProfileIds.includes('vitya'));assert.deepEqual(s.state.social.dialogs.vitya.messages,before);assert.ok(allPc(s.root).some(n=>n.textContent?.includes('заблокирован')));s.view.dispose();
});
