import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPhoneHud} from '../src/phone-hud.js';
import {receivePhoneEvents} from '../src/phone-notifications.js';
import {pcDocument,allPc,fire} from './helpers/virtual-pc-dom.js';
import {getSoundCue} from '../src/sound-cues.js';
const event={id:'a',dueAt:1,source:'Рифмосеть',sender:'Макаревич Battle',text:'Длинный ответ '.repeat(30)};
function setup({fail=false,hidden=false,soundFail=false}={}){
 const d=pcDocument(),root=d.createElement('div');root.hidden=hidden;let phone=receivePhoneEvents(null,[event]),vibrations=0;
 const view=mountPhoneHud(root,{getState:()=>phone,onChange:next=>{if(fail)return false;phone=next;return true;},playVibration:()=>{vibrations++;if(soundFail)throw Error('autoplay');}});
 return {root,view,get phone(){return phone;},get vibrations(){return vibrations;},notice:allPc(root).find(n=>n.dataset?.phoneNotice)};
}
test('one vibration per active ID, no timer dismissal, pointer enter/leave and focus/blur equivalents',()=>{
 const s=setup();assert.equal(s.vibrations,1);for(let i=0;i<100;i++)s.view.update();assert.equal(s.vibrations,1);
 fire(s.notice,'pointerleave');assert.equal(s.phone.activeId,'a');fire(s.notice,'pointerenter');s.view.update();fire(s.notice,'pointerleave');assert.equal(s.phone.activeId,null);s.view.dispose();
 const keyboard=setup();fire(keyboard.notice,'focus');fire(keyboard.notice,'blur');assert.equal(keyboard.phone.activeId,null);keyboard.view.dispose();
});
test('autoplay failure cannot discard notice or replay a later burst; hidden HUD waits until visible',()=>{
 const s=setup({soundFail:true});assert.equal(s.phone.activeId,'a');s.view.update();assert.equal(s.vibrations,1);s.view.dispose();
 const hidden=setup({hidden:true});assert.equal(hidden.vibrations,0);hidden.root.hidden=false;hidden.view.update();assert.equal(hidden.vibrations,1);hidden.view.dispose();
});
test('failed persistence leaves notification visible and text uses safe literal content',()=>{
 const s=setup({fail:true});fire(s.notice,'pointerenter');fire(s.notice,'pointerleave');assert.equal(s.phone.activeId,'a');assert.equal(s.notice.hidden,false);
 assert.ok(allPc(s.root).some(n=>n.textContent===event.text));assert.equal(allPc(s.root).filter(n=>n.tagName==='INPUT'||n.tagName==='TEXTAREA').length,0);s.view.dispose();
 const cue=getSoundCue('phone-vibrate');assert.ok(cue.volume<=.015);assert.ok(cue.duration<.6);
});
