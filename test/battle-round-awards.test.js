import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRoundLtr} from '../src/battle-round-awards.js';
const versions=['a','b','c'].map(id=>({participantId:id,id:'track:'+id}));
const rows=(judgeId,scores)=>versions.map((v,i)=>({judgeId,trackVersionId:v.id,raw:scores[i],grade:Math.round(scores[i]*2)/2,decision:{kind:'pair_vote',winnerId:'track:b'}}));
test('each judge chooses exactly one personal raw maximum, even a pair loser and equal rounded grades',()=>{
 const result=selectRoundLtr({versions,judgeResults:rows('j',[8.59,8.51,8.5]),judgeId:'j',seed:2});assert.deepEqual(result,{judgeId:'j',participantId:'a',trackVersionId:'track:a',rawScore:8.59});
 const shared=['j1','j2','j3'].map(judgeId=>selectRoundLtr({versions,judgeResults:rows(judgeId,[9,8,7]),judgeId,seed:2}));assert.deepEqual(shared.map(r=>r.participantId),['a','a','a']);
 const different=['j1','j2','j3'].map((judgeId,i)=>selectRoundLtr({versions,judgeResults:rows(judgeId,[7,7,7].map((v,k)=>i===k?9:v)),judgeId,seed:2}));assert.deepEqual(different.map(r=>r.participantId),['a','b','c']);
});
test('equal raw maxima use stable lottery independent of ordering; missing submissions and empty rounds cannot win',()=>{
 const input={versions,judgeResults:rows('j',[8,8,2]),judgeId:'j',seed:22},winner=selectRoundLtr(input);assert.deepEqual(selectRoundLtr({...input,versions:[...versions].reverse(),judgeResults:[...input.judgeResults].reverse()}),winner);
 assert.equal(selectRoundLtr({...input,versions:[]}),null);assert.equal(selectRoundLtr({...input,judgeResults:[]}),null);
 assert.equal(selectRoundLtr({...input,versions:versions.slice(2)}).participantId,'c');
 const before=JSON.stringify(input);selectRoundLtr(input);assert.equal(JSON.stringify(input),before);
});
