import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodePcSave,decodePcSave,createPcSnapshotEncoder} from '../src/pc-save-codec.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState,VIRTUAL_PC_STORAGE_KEY} from '../src/virtual-pc-state.js';
import {migrateNoviceSave} from '../src/home-profile-migration.js';
import {SAVE_KEY} from '../src/avatar-v3-profile.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
test('partition encoder rejects combined sections above the decoder limit before writing',()=>{
 const raw='a'.repeat(32*1024*1024),encode=createPcSnapshotEncoder();
 assert.throws(()=>encode({version:1,trackVersions:{raw},judging:{raw}}),/размер/);
});
test('optimized codec reads the pre-optimization Unicode archive byte-for-byte',()=>{const old=readFileSync(new URL('./fixtures/pc-save-legacy.txt',import.meta.url),'utf8').trimEnd(),value={text:'я'.repeat(200001)};assert.deepEqual(decodePcSave(old),value);assert.equal(encodePcSave(value),old);});
test('partitioned persistence remains atomic and notices nested changes without stale cached archives',()=>{
 const state=createVirtualPcState({projects:[{id:'keep'}]}),map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 state.judging.recovery=[{raw:'Неприкосновенный архив '.repeat(15000)}];assert.equal(saveVirtualPcState(storage,state),true);
 assert.ok(map.get(VIRTUAL_PC_STORAGE_KEY).startsWith('BLPC-PARTS1:'));
 state.judging.recovery[0].raw+=' Изменён';assert.equal(saveVirtualPcState(storage,state),true);assert.deepEqual(loadVirtualPcState(storage).state.judging,state.judging);
 const saved=map.get(VIRTUAL_PC_STORAGE_KEY);state.projects.push({id:'new'});assert.equal(saveVirtualPcState({...storage,setItem(){throw Error('quota');}},state),false);assert.equal(map.get(VIRTUAL_PC_STORAGE_KEY),saved);
 map.set(VIRTUAL_PC_STORAGE_KEY,JSON.stringify(createVirtualPcState({projects:[{id:'external'}]})));assert.equal(loadVirtualPcState(storage).state.projects[0].id,'external');
});
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
test('first tournament policy migration reserves exact old save once; failed backup prevents overwrite',()=>{
 const old=ensureBattleWindow(createVirtualPcState(),{battleId:'makarevich-1',nowMinute:600}).state,raw=JSON.stringify(old),key=VIRTUAL_PC_STORAGE_KEY+'-before-tournament-v2',map=new Map([[VIRTUAL_PC_STORAGE_KEY,raw]]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},next=ensureBattleWindow(old,{battleId:'makarevich-1',nowMinute:700,judgingPolicyVersion:2}).state;
 assert.equal(saveVirtualPcState({...storage,setItem(k,v){if(k===key)throw Error('quota');map.set(k,v);}},next),false);assert.equal(map.get(VIRTUAL_PC_STORAGE_KEY),raw);
 assert.equal(saveVirtualPcState(storage,next),true);assert.equal(map.get(key),raw);assert.equal(saveVirtualPcState(storage,next),true);assert.equal(map.get(key),raw);
});
