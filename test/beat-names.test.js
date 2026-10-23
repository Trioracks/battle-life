import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBeatName,PROJECT_NAMES} from '../src/beat-names.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createBeat} from '../src/beat-production.js';
test('new custom-named beats retain their creation date for the project picker after reload',()=>{
 const r=createBeat(createVirtualPcState(),{id:'b',name:'Мой бит',gameDay:8});assert.equal(r.ok,true,r.reason);
 const saved=createVirtualPcState(JSON.parse(JSON.stringify(r.state)));assert.equal(saved.projects[0].createdDay,8);
});

test('random names exclude previous and every existing base name regardless of date or case',()=>{
 assert.equal(randomBeatName(2,'',()=>0,['01.09.2012 — ПЫЛЬНЫЙ РАЙОН']),'02.09.2012 — Пыльный двор');
 assert.equal(randomBeatName(2,'01.09.2012 — Пыльный район',()=>0),'02.09.2012 — Пыльный двор');
});
test('exhausting the authored dictionary yields a unique extension in bounded work',()=>{
 const existing=PROJECT_NAMES.map(name=>'01.09.2012 — '+name);
 const next=randomBeatName(2,'',()=>0,existing);assert.equal(next,'02.09.2012 — Пыльный район (2)');
 assert.equal(randomBeatName(3,'',()=>0,[...existing,next]),'03.09.2012 — Пыльный район (3)');
});
