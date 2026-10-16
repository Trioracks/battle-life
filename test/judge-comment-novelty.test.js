import test from 'node:test';
import assert from 'node:assert/strict';
import {generateJudgeReview} from '../src/judge-comments.js';
import {JUDGE_PROFILES} from '../src/judge-profiles.js';
import {reviewFixture} from './judge-comments.test.js';
test('fifty similar and fifty diverse works for every judge: no unsupported claims or recent repeated content',()=>{
 for(const p of JUDGE_PROFILES)for(const scenario of ['similar','diverse']){
  let history=[];const recent=[];
  for(let i=0;i<50;i++){
   const input=reviewFixture(p.id+':'+scenario+':'+i,scenario==='similar'?20:10+(i*17)%90,p.id),run=generateJudgeReview(input,{seed:i+47,history});
   assert.ok(run.result?.comment,p.id+' '+i);assert.deepEqual(run.diagnostics.unsupportedClaims,[]);assert.deepEqual(run.diagnostics.noveltyShortages,[],p.id+' '+scenario+' '+i);
   assert.ok(!recent.includes(run.result.comment),p.id+' repeats prose');for(const old of history.slice(-12))assert.ok(!old.templateIds.some(id=>run.result.templateIds.includes(id)));
   recent.push(run.result.comment);if(recent.length>12)recent.shift();history=run.history;
  }
 }
});
