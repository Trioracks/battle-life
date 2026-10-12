import test from 'node:test';
import assert from 'node:assert/strict';
import {encodePcSave,decodePcSave} from '../src/pc-save-codec.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState,VIRTUAL_PC_STORAGE_KEY} from '../src/virtual-pc-state.js';
import {migrateNoviceSave} from '../src/home-profile-migration.js';
import {SAVE_KEY} from '../src/avatar-v3-profile.js';
test('large Unicode save is lossless and compact; small and legacy JSON remain readable',()=>{
 const small={version:1,text:'Привет 🙂'};assert.equal(encodePcSave(small),JSON.stringify(small));assert.deepEqual(decodePcSave(JSON.stringify(small)),small);
 const big={rows:Array.from({length:12000},(_,i)=>({id:'result:'+i,text:'Старый неизменяемый отзыв, вокал и барабаны 🎙',facts:['text.contentMix','audio.rhythm'],value:i/19}))};
 const encoded=encodePcSave(big);assert.ok(encoded.startsWith('BLPC-LZW1:'));assert.ok(encoded.length<JSON.stringify(big).length*.4);assert.deepEqual(decodePcSave(encoded),big);
 assert.throws(()=>decodePcSave(encoded.slice(0,-3)));assert.throws(()=>decodePcSave(encoded.replace(/:(\d+):/,':999999999:')));
});
test('large saved projects survive real persistence and novice migration; rejected write keeps the last save',()=>{
 const state=createVirtualPcState({projects:Array.from({length:500},(_,i)=>({id:'p'+i,name:'Текст'+i,type:'text',content:'Сохранённые слова '.repeat(60)}))}),map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 assert.equal(saveVirtualPcState(storage,state),true);assert.deepEqual(loadVirtualPcState(storage).state.projects,state.projects);
 map.set(SAVE_KEY,JSON.stringify({version:4,noviceSchema:1,name:'Игрок',skills:{}}));assert.equal(migrateNoviceSave(storage).ok,true);
 const raw=map.get(VIRTUAL_PC_STORAGE_KEY);assert.equal(saveVirtualPcState({...storage,setItem(){throw Error('quota');}},state),false);assert.equal(map.get(VIRTUAL_PC_STORAGE_KEY),raw);
});
