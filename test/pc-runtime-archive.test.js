import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDemo} from './helpers/package-two-fixture.js';
import {advanceVirtualPc} from '../src/virtual-pc-runtime.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {pcDocument} from './helpers/virtual-pc-dom.js';
import * as savedPc from '../src/virtual-pc-state.js';

test('host archive preparation protects published history but keeps creative state editable',()=>{
 assert.equal(typeof savedPc.preparePcRuntimeState,'function');
 const s=freshDemo();s.judging.recovery.push({raw:{comment:'keep'}});savedPc.preparePcRuntimeState(s);
 assert.throws(()=>{s.judging.recovery[0].raw.comment='overwrite';},TypeError);
 s.music.needs.energy=50;assert.equal(s.music.needs.energy,50);
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 assert.equal(savedPc.saveVirtualPcState(storage,s),true);assert.equal(savedPc.saveVirtualPcState(storage,{...s,lastGameMinute:601}),true);
 assert.equal(savedPc.loadVirtualPcState(storage).state.judging.recovery[0].raw.comment,'keep');
});

test('ordinary clock frames retain archive objects rather than rebuilding published history',()=>{
 const initial=freshDemo();const next=advanceVirtualPc(initial,{day:1,minutes:601}).state;
 assert.equal(next.trackVersions,initial.trackVersions);assert.equal(next.judging,initial.judging);
 assert.equal(initial.lastGameMinute,null,'runtime cannot mutate its input clock');
 const same=advanceVirtualPc(next,{day:1,minutes:601}).state;assert.equal(same.trackVersions,initial.trackVersions);
});
test('host UI synchronization uses the already normalized runtime snapshot without cloning the archive',()=>{
 const d=pcDocument(),root=d.createElement('main'),pc=mountVirtualPc(root,{audio:{stop(){},dispose(){}},beatAudio:{stop(){},dispose(){}}});
 const state=freshDemo();pc.syncState(state);assert.equal(pc.state,state);pc.syncState(state);assert.equal(pc.state.trackVersions,state.trackVersions);pc.dispose();
});
