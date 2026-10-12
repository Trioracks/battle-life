import test from 'node:test';
import assert from 'node:assert/strict';
import * as registration from '../src/social-registration.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {mountUnderweb} from '../src/underweb-view.js';
import {pcDocument,findButton,allPc} from './helpers/virtual-pc-dom.js';
test('registration uses hero nickname, one saved window, rejects deadline and is idempotent',()=>{
 const first=registration.registerBattle(createVirtualPcState(),{battleId:'makarevich-1',playerName:'Герой',nowMinute:600});assert.equal(first.ok,true);assert.equal(first.state.battleApplications[0].nickname,'Герой');const w=first.state.battleWindows[0];
 const second=registration.registerBattle(first.state,{battleId:'makarevich-1',playerName:'Другой',nowMinute:601});assert.equal(second.alreadyRegistered,true);assert.equal(second.state.battleApplications.length,1);assert.deepEqual(second.state.battleWindows,[w]);assert.equal(second.state.battleApplications[0].nickname,'Герой');
 assert.equal(registration.registerBattle(first.state,{battleId:'makarevich-1',playerName:'Герой',nowMinute:w.closesAt}).ok,false);
 assert.deepEqual(registration.battleDeadlineLabel(w,600),{text:'Приём заявок и треков до 08.09.2012 10:00',open:true});assert.equal(registration.battleDeadlineLabel(w,w.closesAt).open,false);
});
test('site and community share registration and deadline; failed persistence cannot claim success',()=>{
 const d=pcDocument(),root=d.createElement('div');let state=createVirtualPcState(),allow=false;
 const view=mountUnderweb(root,{getState:()=>state,getMetadata:()=>({gameMinutes:600,gameDay:1,playerName:'Герой'}),onChange:next=>{if(!allow)return false;state=next;return true;}});
 view.navigate('underweb://battles/makarevich-1');findButton(root,'Подать заявку').click();findButton(root,'Подтвердить заявку').click();assert.equal(state.battleApplications.length,0);assert.equal(allPc(root).some(n=>n.textContent?.startsWith('Ваша заявка принята')),false);
 allow=true;view.navigate('underweb://social/community/makarevich-1');findButton(root,'Зарегистрироваться').click();assert.equal(state.battleApplications.length,1);assert.ok(allPc(root).some(n=>n.textContent==='Ваша заявка принята, Герой. Ожидаем вашего трека'));
 view.navigate('underweb://battles/makarevich-1');assert.ok(findButton(root,'Открыть сообщения сообщества'));assert.ok(allPc(root).some(n=>n.textContent==='Приём заявок и треков до 08.09.2012 10:00'));assert.equal(state.social.subscriptions.length,0);view.dispose();
});
