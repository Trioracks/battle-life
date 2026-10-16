import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPhoneHud} from '../src/phone-hud.js';
import {receivePhoneEvents} from '../src/phone-notifications.js';
import {pcDocument,allPc,fire} from './helpers/virtual-pc-dom.js';
import {getSoundCue,playSoundCue} from '../src/sound-cues.js';
const event={id:'a',dueAt:1,source:'Рифмосеть',sender:'Макаревич Battle',text:'Длинный ответ '.repeat(30)};
function setup({fail=false,hidden=false,soundFail=false,presentation={firstWakeAtMinute:0,announcedIds:[]},ackFail=false,reduced=false,noticeEvent=event}={}){
 const d=pcDocument(),events=new EventTarget(),root=d.createElement('div');d.addEventListener=events.addEventListener.bind(events);d.removeEventListener=events.removeEventListener.bind(events);d.dispatchEvent=events.dispatchEvent.bind(events);d.defaultView={matchMedia:()=>({matches:reduced})};
 let phone=receivePhoneEvents(null,[noticeEvent]),vibrations=0,acknowledgments=0,durableAtCue=false;
 const context={nowMinute:1,sleeping:false,mode:hidden?'pc':'game',pcPhase:hidden?'desktop':'room',needs:{satiety:54,energy:69}};
 const view=mountPhoneHud(root,{getState:()=>phone,getPresentation:()=>presentation,getContext:()=>context,onPresentationChange:next=>{acknowledgments++;if(ackFail)return false;presentation=next;return true;},onChange:next=>{if(fail)return false;phone=next;return true;},playVibration:()=>{durableAtCue=presentation.announcedIds.includes('a');vibrations++;if(soundFail)throw Error('autoplay');}});
 return {root,view,d,context,get presentation(){return presentation;},get acknowledgments(){return acknowledgments;},get phone(){return phone;},get vibrations(){return vibrations;},get durableAtCue(){return durableAtCue;},notice:allPc(root).find(n=>n.dataset?.phoneNotice),device:allPc(root).find(n=>n.dataset?.phoneToggle),panel:allPc(root).find(n=>n.dataset?.phonePanel)};
}
test('one vibration per active ID, no timer dismissal, pointer enter/leave and focus/blur equivalents',()=>{
 const s=setup();assert.equal(s.vibrations,1);for(let i=0;i<100;i++)s.view.update();assert.equal(s.vibrations,1);
 fire(s.notice,'pointerleave');assert.equal(s.phone.activeId,'a');fire(s.notice,'pointerenter');s.view.update();fire(s.notice,'pointerleave');assert.equal(s.phone.activeId,null);s.view.dispose();
 const keyboard=setup();fire(keyboard.notice,'focus');fire(keyboard.notice,'blur');assert.equal(keyboard.phone.activeId,null);keyboard.view.dispose();
});
test('autoplay failure cannot discard notice or replay a later burst; hidden HUD waits until visible',()=>{
 const s=setup({soundFail:true});assert.equal(s.phone.activeId,'a');s.view.update();assert.equal(s.vibrations,1);s.view.dispose();
 const hidden=setup({hidden:true});assert.equal(hidden.vibrations,0);hidden.context.mode='game';hidden.context.pcPhase='room';hidden.view.update();assert.equal(hidden.vibrations,1);hidden.view.dispose();
});

test('sleep and computer contexts preserve the queue until the first wake plus fifteen game seconds',()=>{
 const s=setup({hidden:true,presentation:{firstWakeAtMinute:null,announcedIds:[]}}),queue=JSON.stringify(s.phone);
 s.context.mode='game';s.context.pcPhase='room';s.context.sleeping=true;s.view.update();assert.equal(s.vibrations,0);assert.equal(s.notice.hidden,true);assert.equal(s.presentation.firstWakeAtMinute,null);
 assert.equal(s.root.hidden,false);s.device.click();assert.equal(s.panel.hidden,false);assert.ok(allPc(s.panel).some(n=>n.textContent==='Энергия · 69 / 100'));s.device.click();
 s.context.sleeping=false;s.context.nowMinute=600;s.view.update();assert.equal(s.presentation.firstWakeAtMinute,600);assert.equal(s.vibrations,0);
 s.context.nowMinute=600.249;s.view.update();assert.equal(s.notice.hidden,true);
 s.context.nowMinute=600.25;s.view.update();assert.equal(s.notice.hidden,false);assert.equal(s.vibrations,1);
 s.context.pcPhase='preparing';s.view.update();assert.equal(s.root.hidden,true);s.context.pcPhase='room';s.view.update();assert.equal(s.vibrations,1);assert.equal(JSON.stringify(s.phone),queue);s.view.dispose();
});

test('delivery is durable before cue, survives reload and failed saves latch without frame retries',()=>{
 const failed=setup({ackFail:true});assert.equal(failed.vibrations,0);assert.equal(failed.notice.hidden,false);assert.deepEqual(failed.presentation.announcedIds,[]);
 for(let i=0;i<100;i++)failed.view.update();assert.equal(failed.acknowledgments,1);failed.view.dispose();
 const saved=setup();assert.deepEqual(saved.presentation.announcedIds,['a']);assert.equal(saved.vibrations,1);assert.equal(saved.durableAtCue,true);const snapshot=JSON.parse(JSON.stringify(saved.presentation));saved.view.dispose();
 const reloaded=setup({presentation:snapshot});assert.equal(reloaded.notice.hidden,false);assert.equal(reloaded.vibrations,0);assert.equal(reloaded.acknowledgments,0);reloaded.view.dispose();
 const wakeFailure=setup({hidden:true,presentation:{firstWakeAtMinute:null,announcedIds:[]},ackFail:true});wakeFailure.context.mode='game';wakeFailure.context.pcPhase='room';
 for(let i=0;i<100;i++){wakeFailure.context.nowMinute++;wakeFailure.view.update();}assert.equal(wakeFailure.acknowledgments,1);assert.equal(wakeFailure.vibrations,0);wakeFailure.view.dispose();
});

test('phone button opens live needs and time; repeat, Escape and outside pointer close it',()=>{
 const s=setup();assert.equal(s.device.tagName,'BUTTON');assert.equal(s.panel.hidden,true);s.device.click();assert.equal(s.panel.hidden,false);assert.equal(s.device.getAttribute('aria-expanded'),'true');
 assert.ok(allPc(s.panel).some(n=>n.textContent==='Сытость · 54 / 100'));assert.ok(allPc(s.panel).some(n=>n.textContent==='Энергия · 69 / 100'));
 s.context.needs.energy=40;s.view.update();assert.ok(allPc(s.panel).some(n=>n.textContent==='Энергия · 40 / 100'));
 s.device.click();assert.equal(s.panel.hidden,true);s.device.click();const escape=fire(s.d,'keydown',{key:'Escape'});assert.equal(s.panel.hidden,true);assert.equal(escape.defaultPrevented,true);
 s.device.click();fire(s.d,'pointerdown',{target:s.d.createElement('div')});assert.equal(s.panel.hidden,true);s.view.dispose();
});

test('reduced motion suppresses device animation without suppressing durable delivery',()=>{
 const s=setup({hidden:true,reduced:true});let animations=0;s.device.animate=()=>animations++;s.context.mode='game';s.context.pcPhase='room';s.view.update();assert.equal(animations,0);assert.equal(s.vibrations,1);assert.deepEqual(s.presentation.announcedIds,['a']);s.view.dispose();
});

test('phone sound has three quiet pulses within a short bounded burst',()=>{
 const levels=[],gain={gain:{setValueAtTime:(value,time)=>levels.push({value,time}),exponentialRampToValueAtTime(){}},connect:()=>gain};
 const oscillator={frequency:{setValueAtTime(){}},connect:()=>gain,start(){},stop(time){assert.ok(time<10.6);}};
 playSoundCue('phone-vibrate',{currentTime:10,createOscillator:()=>oscillator,createGain:()=>gain,destination:{}});
 assert.equal(levels.filter(level=>level.value>.002).length,3);assert.ok(levels.every(level=>level.value<=.015));
});

test('legacy social app labels display canonically without changing the queue',()=>{
 const s=setup(),before=JSON.stringify(s.phone);
 assert.ok(allPc(s.root).some(n=>n.textContent==='В кругу'));
 assert.equal(JSON.stringify(s.phone),before);assert.equal(s.phone.queue[0].source,'Рифмосеть');s.view.dispose();
});

test('notice footer directs group publications to the wall and personal notices to messages',()=>{
 for(const [type,want] of [['community-post','Полностью — на стене группы на ПК'],['message','Полностью — в сообщениях на ПК']]){
  const s=setup({noticeEvent:{...event,type,communityId:'makarevich-1',postId:'welcome'}});
  assert.equal(allPc(s.notice).find(n=>n.className==='bl-phone-hint').textContent,want);s.view.dispose();
 }
});

test('phone LCD shows the live game clock while the needs panel is closed',()=>{
 const s=setup();assert.equal(s.panel.hidden,true);assert.ok(allPc(s.device).some(n=>n.textContent==='00:01'));
 s.context.nowMinute=1503;s.view.update();assert.ok(allPc(s.device).some(n=>n.textContent==='01:03'));s.view.dispose();
});
test('failed persistence leaves notification visible and text uses safe literal content',()=>{
 const s=setup({fail:true});fire(s.notice,'pointerenter');fire(s.notice,'pointerleave');assert.equal(s.phone.activeId,'a');assert.equal(s.notice.hidden,false);
 assert.ok(allPc(s.root).some(n=>n.textContent===event.text));assert.equal(allPc(s.root).filter(n=>n.tagName==='INPUT'||n.tagName==='TEXTAREA').length,0);s.view.dispose();
 const cue=getSoundCue('phone-vibrate');assert.ok(cue.volume<=.015);assert.ok(cue.duration<.6);
});
