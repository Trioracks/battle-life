import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateTrack} from '../src/judge-evaluation.js';
import {judgeProfile,validateJudgeCoverage,JUDGE_PROFILES} from '../src/judge-profiles.js';
import {JUDGE_COMMENTS,generateJudgeReview} from '../src/judge-comments.js';
import {DEMO_BATTLE} from '../src/battle-demo-config.js';
const axes=['text','performance','music','sound'],v=(id,q)=>({id,qualities:Object.fromEntries(axes.map((k,i)=>[k,q[i]])),facts:[]}),j=weights=>({id:'judge',weights:Object.fromEntries(axes.map((k,i)=>[k,weights[i]])),formatAdherence:0,strictnessOffset:0});
test('19/21close contenders divide tastes, wide gap stays meaningful and both directions share one vote',()=>{
 const a=v('a',[8,4,3,4]),b=v('b',[4,7,6,4]);
 assert.equal(evaluateTrack(a,j([.7,.1,.1,.1]),null,{opponent:b,tieSeed:4}).decision.winnerId,'a');assert.equal(evaluateTrack(a,j([.1,.5,.3,.1]),null,{opponent:b,tieSeed:4}).decision.winnerId,'b');
 for(const judge of JUDGE_PROFILES){const low=v('low',[2,2,2,2]),high=v('high',[8,8,8,8]);assert.equal(evaluateTrack(low,judge,null,{opponent:high,tieSeed:2}).decision.winnerId,'high');}
});
test('live exact equality compares preferred aspects then seeded lot; complete odd panels cannot tie',()=>{
 const a=v('a',[5,5,5,5]),b=v('b',[5,5,5,5]);let votes=0;
 for(const id of DEMO_BATTLE.panels['round-2'].judgeIds){const judge=judgeProfile(id),x=evaluateTrack(a,judge,null,{opponent:b,tieSeed:'round-2'}),y=evaluateTrack(b,judge,null,{opponent:a,tieSeed:'round-2'});assert.equal(x.decision.kind,'pair_vote');assert.equal(x.decision.winnerId,y.decision.winnerId);assert.equal(x.decision.resolvedBy,'seeded-lottery');votes+=Number(x.decision.winnerId==='a');}
 assert.notEqual(votes,DEMO_BATTLE.panels['round-2'].judgeIds.length/2);
 const x=evaluateTrack(v('c',[6,4,4,4]),j([.25,.25,.25,.25]),null,{opponent:v('d',[4,6,4,4]),tieSeed:5});assert.equal(x.decision.winnerId,'c');assert.equal(x.decision.resolvedBy,'preferred-aspect');
});
test('all game panels are odd unique backed by a profile and comment bank; reserves are not voters',()=>{
 const panels=Object.values(DEMO_BATTLE.panels);assert.deepEqual(validateJudgeCoverage(panels,JUDGE_PROFILES),[]);
 for(const panel of panels){assert.equal(panel.judgeIds.length%2,1);assert.equal(new Set(panel.judgeIds).size,panel.judgeIds.length);for(const id of panel.judgeIds)assert.ok(JUDGE_COMMENTS.some(t=>t.judgeId===id),id);}
});
test('live review resolves exact tie before selecting comments and survives stored history',()=>{
 const version=v('one',[5,5,5,5]),opponent=v('two',[5,5,5,5]),judge=judgeProfile('eparhiya'),input={version,opponent,judge,format:{battleId:'makarevich-1',roundId:'round-2'},pairTieSeed:7};
 const generated=generateJudgeReview(input,{seed:5});assert.equal(generated.result.decision.kind,'pair_vote');assert.deepEqual(generateJudgeReview({...input,pairTieSeed:99},{seed:1,history:generated.history}).result,generated.result);
});
