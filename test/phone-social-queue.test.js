import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhone,receivePhoneEvents,hoverPhoneNotice} from '../src/phone-notifications.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advancePersonalDialogs} from '../src/social-personal.js';
import {mountPhoneHud} from '../src/phone-hud.js';
import {pcDocument} from './helpers/virtual-pc-dom.js';
const event=(id,time)=>({id,type:'submission-ack',source:'Рифмосеть',sender:'Макаревич Battle',text:'Работа получена.',dueAt:time,entityId:'entry'});
test('notice remains indefinitely until enter then leave; outside alone never dismisses',()=>{
 const p=receivePhoneEvents(null,[event('a',1)]);assert.equal(p.activeId,'a');assert.equal(hoverPhoneNotice(p,'a',false).activeId,'a');
 const entered=hoverPhoneNotice(p,'a',true);assert.equal(entered.activeId,'a');const reloaded=normalizePhone(JSON.parse(JSON.stringify(entered)));assert.ok(reloaded.hoveredIds.includes('a'));
 const closed=hoverPhoneNotice(reloaded,'a',false);assert.equal(closed.activeId,null);assert.ok(closed.dismissedIds.includes('a'));assert.equal(receivePhoneEvents(closed,[event('a',1)]).activeId,null);
});
test('queue is stable by due minute and ID; duplicate events and unrelated hover cannot consume entries',()=>{
 let p=receivePhoneEvents(null,[event('b',2),event('c',3),event('a',2),event('b',2)]);assert.deepEqual(p.queue.map(e=>e.id),['a','b','c']);assert.equal(p.activeId,'a');
 assert.deepEqual(hoverPhoneNotice(p,'c',true),p);p=hoverPhoneNotice(hoverPhoneNotice(p,'a',true),'a',false);assert.equal(p.activeId,'b');
 p=receivePhoneEvents(p,[event('older',1)]);assert.equal(p.activeId,'b');p=hoverPhoneNotice(hoverPhoneNotice(p,'b',true),'b',false);assert.equal(p.activeId,'older');
});
test('save/reload keeps phone independent of dialog unread and rejects malformed notices',()=>{
 const s=createVirtualPcState();s.social.dialogs['makarevich-1']={unread:true,messages:[]};s.phone=receivePhoneEvents(null,[event('a',1),{id:'bad',dueAt:NaN}]);
 s.phone=hoverPhoneNotice(s.phone,'a',true);const loaded=createVirtualPcState(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(loaded.phone,s.phone);loaded.phone=hoverPhoneNotice(loaded.phone,'a',false);assert.equal(loaded.social.dialogs['makarevich-1'].unread,true);
});
test('catch-up of two personal messages queues both but does not multiply sound on repeated frames',()=>{
 const state=advancePersonalDialogs(createVirtualPcState(),4000).state,d=pcDocument(),root=d.createElement('aside');let sounds=0;
 const hud=mountPhoneHud(root,{getState:()=>state.phone,onChange:phone=>state.phone=phone,playVibration:()=>sounds++});hud.update();hud.update();assert.equal(state.phone.queue.length,2);assert.equal(sounds,1);assert.equal(state.social.dialogs.vitya.unread,true);hud.dispose();
});
