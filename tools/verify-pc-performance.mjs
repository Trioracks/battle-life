import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createVirtualPcState,preparePcRuntimeState,saveVirtualPcState,loadVirtualPcState,VIRTUAL_PC_STORAGE_KEY} from '../src/virtual-pc-state.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {advanceBattleLifecycle} from '../src/battle-judging-clock.js';
import {advanceVirtualPcDurably} from '../src/virtual-pc-runtime.js';
const out='D:/Project/Battle/artifacts/v-krugu-qa';await mkdir(out,{recursive:true});
let state;try{state=JSON.parse(await readFile(out+'/final-archive-fixture.json','utf8'));}catch{state=advanceBattleLifecycle(ensureBattleWindow(createVirtualPcState(),{battleId:'makarevich-1',nowMinute:600,judgingPolicyVersion:2}).state,100000).state;await writeFile(out+'/final-archive-fixture.json',JSON.stringify(state));}
state=createVirtualPcState(state);assert.equal(state.tournaments.byId['makarevich-1'].status,'complete');
const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},persist=s=>saveVirtualPcState(storage,preparePcRuntimeState(s));
const samples=[],saves=[];for(let i=0;i<8;i++){let at=performance.now();state=advanceVirtualPcDurably(state,{day:71,minutes:i/10},persist).state;samples.push(performance.now()-at);at=performance.now();assert.equal(persist(state),true);saves.push(performance.now()-at);}
const restored=loadVirtualPcState(storage);assert.equal(restored.ok,true);assert.deepEqual(restored.state.trackVersions,state.trackVersions);assert.deepEqual(restored.state.judging,state.judging);
const result={versions:Object.keys(state.trackVersions.byId).length,reviews:Object.keys(state.judging.results).length,framesMs:samples,savesMs:saves,storedCharacters:values.get(VIRTUAL_PC_STORAGE_KEY).length};await writeFile(out+'/pc-performance-node.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
assert.ok(Math.max(...samples.slice(1))<30,'steady simulation frames must stay below30ms');assert.ok(Math.max(...saves.slice(1))<100,'steady full saves must stay below100ms');
