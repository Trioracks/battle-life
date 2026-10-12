import test from 'node:test';
import assert from 'node:assert/strict';
import {seedBracket,rankTournamentSelection} from '../src/battle-seeding.js';
const ids=n=>Array.from({length:n},(_,i)=>'p'+(i+1));
test('all three seedings use every entrant once and retain adjacent winner links at8/32',()=>{
 for(const n of [8,32])for(const mode of ['neighbors','random','opposite']){
  const bracket=seedBracket(ids(n),{mode,seed:71});assert.equal(bracket.rounds.length,Math.log2(n));
  assert.deepEqual(bracket.rounds[0].flatMap(p=>p.participantIds).sort(),ids(n).sort());
  for(let r=1;r<bracket.rounds.length;r++)for(const [i,node]of bracket.rounds[r].entries())assert.deepEqual(node.sourceNodeIds,[bracket.rounds[r-1][i*2].id,bracket.rounds[r-1][i*2+1].id]);
  assert.deepEqual(seedBracket(ids(n),{mode,seed:71}),bracket);
 }
 const neighbors=seedBracket(ids(8),{mode:'neighbors',seed:1});assert.deepEqual(neighbors.rounds[0].map(p=>p.participantIds),[['p1','p2'],['p3','p4'],['p5','p6'],['p7','p8']]);
 const opposite=seedBracket(ids(8),{mode:'opposite',seed:1});assert.deepEqual(opposite.rounds[0].map(p=>p.participantIds),[['p1','p8'],['p4','p5'],['p2','p7'],['p3','p6']]);
 assert.notDeepEqual(seedBracket(ids(32),{mode:'random',seed:1}),seedBracket(ids(32),{mode:'random',seed:2}));
});
test('selection uses five half grades and an explicit deterministic equal-score lottery, never hero privilege',()=>{
 const entries=[...ids(32),'player'],scores=Object.fromEntries(entries.map((id,i)=>[id,Array(5).fill(i===32?1:5)]));
 let r=rankTournamentSelection(entries,scores,{limit:32,seed:20});assert.equal(r.qualifiedIds.includes('player'),false);assert.equal(r.ranked.length,33);
 scores.player=Array(5).fill(9.5);r=rankTournamentSelection(entries,scores,{limit:32,seed:20});assert.equal(r.qualifiedIds[0],'player');assert.equal(r.qualifiedIds.length,32);assert.equal(r.ranked[0].total,47.5);
 const tied=Object.fromEntries(entries.map(id=>[id,[5,5,5,5,5]]));assert.deepEqual(rankTournamentSelection(entries,tied,{seed:20}),rankTournamentSelection([...entries].reverse(),tied,{seed:20}));
 assert.notDeepEqual(rankTournamentSelection(entries,tied,{seed:20}).qualifiedIds,rankTournamentSelection(entries,tied,{seed:21}).qualifiedIds);
 assert.throws(()=>rankTournamentSelection(entries,{...scores,p1:[5,5,5,5,5.2]},{seed:20}));assert.throws(()=>seedBracket(['x','x'],{mode:'neighbors',seed:1}));
});
