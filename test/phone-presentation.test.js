import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhonePresentation,phonePresentation} from '../src/phone-presentation.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState} from '../src/virtual-pc-state.js';

test('presentation migrates old saves and retains a valid first wake and unique delivery IDs',()=>{
 assert.deepEqual(normalizePhonePresentation(null),{firstWakeAtMinute:null,announcedIds:[]});
 assert.deepEqual(normalizePhonePresentation({firstWakeAtMinute:-1,announcedIds:['a','a',null,'']}),{firstWakeAtMinute:null,announcedIds:['a']});
 const state=createVirtualPcState({phonePresentation:{firstWakeAtMinute:1050.5,announcedIds:['a']}});
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert.equal(saveVirtualPcState(storage,state),true);
 assert.deepEqual(loadVirtualPcState(storage).state.phonePresentation,{firstWakeAtMinute:1050.5,announcedIds:['a']});
});

test('first notification opens precisely fifteen game seconds after the durable first wake',()=>{
 const state={phonePresentation:{firstWakeAtMinute:600,announcedIds:[]},music:{needs:{satiety:61,energy:73}}};
 assert.equal(phonePresentation(state,{nowMinute:600.249,sleeping:false,mode:'game',pcPhase:'room'}).canNotify,false);
 const shown=phonePresentation(state,{nowMinute:600.25,sleeping:false,mode:'game',pcPhase:'room'});
 assert.equal(shown.canNotify,true);assert.equal(shown.visible,true);
 assert.equal(shown.time,'01.09.2012 10:00');assert.deepEqual(shown.needs,{satiety:61,energy:73});
 assert.equal(phonePresentation({...state,phonePresentation:null},{nowMinute:600.25,sleeping:false,mode:'game',pcPhase:'room'}).canNotify,false);
});

test('sleep retains the date and needs affordance while suppressing notification delivery',()=>{
 const state=createVirtualPcState({phonePresentation:{firstWakeAtMinute:0,announcedIds:[]}});
 const shown=phonePresentation(state,{nowMinute:600,sleeping:true,mode:'game',pcPhase:'room'});
 assert.equal(shown.visible,true);assert.equal(shown.canNotify,false);assert.equal(shown.time,'01.09.2012 10:00');
});

test('PC transitions and creative work cannot show or announce the queued phone event',()=>{
 const state=createVirtualPcState({phonePresentation:{firstWakeAtMinute:0,announcedIds:[]}}),before=JSON.stringify(state);
 for(const context of [
  {sleeping:false,mode:'pc',pcPhase:'desktop'},
  {sleeping:false,mode:'game',pcPhase:'preparing'},
  {sleeping:false,mode:'pc',pcPhase:'working'},
  {sleeping:false,mode:'menu',pcPhase:'room'},
 ]){const shown=phonePresentation(state,{nowMinute:600,...context});assert.equal(shown.visible,false);assert.equal(shown.canNotify,false);}
 assert.equal(JSON.stringify(state),before);
});
