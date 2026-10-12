import test from 'node:test';
import assert from 'node:assert/strict';
import {battleFormat,formatMismatch,checkHardRules} from '../src/battle-format.js';
test('four independent soft axes, separate hard rules and cloned profiles',()=>{
 const f=battleFormat('makarevich-1','selection');assert.deepEqual(Object.keys(f.axes),['diss_addressing','text_approach','genre_profile','sound_aesthetic']);assert.equal(f.maxPenalty,1.5);assert.ok(f.hardRules);f.maxPenalty=9;assert.equal(battleFormat('makarevich-1','selection').maxPenalty,1.5);assert.equal(battleFormat('no','selection'),null);
});
test('absence is not evidence; addressing charged once, technical sound and swearing not format',()=>{
 const f=battleFormat('makarevich-1','selection');f.axes={diss_addressing:{weight:1,target:1}};
 assert.deepEqual(formatMismatch({facts:[]},f),{value:0,evidenceIds:[],axes:[],limitedEvidence:true});
 const v={qualities:{sound:2},facts:[{id:'a',key:'format.diss_addressing',value:0},{id:'b',key:'text.no_diss',value:true},{id:'c',key:'text.no_addressing',value:true},{id:'d',key:'text.profanity',value:true}]};
 const m=formatMismatch(v,f);assert.equal(m.value,1);assert.deepEqual(m.evidenceIds,['a']);v.qualities.sound=10;assert.deepEqual(formatMismatch(v,f),m);
});
test('hard rule failures are separate from dislike of genre',()=>{
 const f=battleFormat('makarevich-1','selection');assert.equal(checkHardRules({recipe:{descriptor:{duration:21.333,bpm:90}}},f).violations.length,0);assert.equal(checkHardRules({recipe:{descriptor:{duration:900,bpm:90}}},f).violations.length,1);
});
