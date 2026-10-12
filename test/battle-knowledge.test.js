import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBattleKnowledge,revealBattleKnowledge,battleKnowledgeHints} from '../src/battle-knowledge.js';
import {battleFormat} from '../src/battle-format.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
test('study is saved idempotent evidence, unlocks qualitative hints, never changes format',()=>{
 const before=battleFormat('makarevich-1','selection'),input={battleId:'makarevich-1',roundId:'selection',analysisSkill:100,evidenceId:'rules:v1'};
 const k=revealBattleKnowledge(null,input);assert.deepEqual(revealBattleKnowledge(k,input),k);assert.deepEqual(normalizeBattleKnowledge(JSON.parse(JSON.stringify(k))),k);
 assert.deepEqual(createVirtualPcState({...createVirtualPcState(),battleKnowledge:k}).battleKnowledge,k);
 const hints=battleKnowledgeHints(k,input);assert.ok(hints.hints.length>battleKnowledgeHints(revealBattleKnowledge(null,{...input,analysisSkill:0}),input).hints.length);assert.ok(hints.hints.every(x=>typeof x==='string'&&!/weight|target|0\./.test(x)));assert.deepEqual(battleFormat('makarevich-1','selection'),before);assert.deepEqual(revealBattleKnowledge(k,{...input,battleId:'no'}),k);
});
