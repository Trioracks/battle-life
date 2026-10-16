import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateTrack,perceiveTrack} from '../src/judge-evaluation.js';
import {REFERENCE_CATALOG} from '../src/cultural-references.js';
const axes=['text','performance','music','sound'];
const v=(id,q)=>({id,qualities:Object.fromEntries(axes.map((k,i)=>[k,q[i]])),facts:[]});
const j=(w=[.25,.25,.25,.25])=>({id:'test',weights:Object.fromEntries(axes.map((k,i)=>[k,w[i]])),formatAdherence:0,strictnessOffset:0,knowledge:{sourceIds:[]}});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('personal quality and raw pair decisions reflect taste, never rounded totals or input order',()=>{
 const a=v('a',[9,5,3,2]),b=v('b',[4,6,6,5]);
 for(const [weights,qa,qb] of [[[.25,.25,.25,.25],4.75,5.25],[[.6,.2,.1,.1],6.9,4.7],[[.1,.2,.6,.1],3.9,5.7]]){
  near(evaluateTrack(a,j(weights),null).raw,qa);near(evaluateTrack(b,j(weights),null).raw,qb);
  const x=evaluateTrack(a,j(weights),null,{opponent:b}),y=evaluateTrack(b,j(weights),null,{opponent:a});assert.equal(x.decision.winnerId,y.decision.winnerId);
 }
 assert.equal(evaluateTrack(a,j(),null,{opponent:structuredClone(a)}).decision.kind,'tie');
});
test('one bounded format penalty then strictness and half step display only',()=>{
 const a=v('a',[7.2,7.2,7.2,7.2]),f={maxPenalty:1.5,axes:Object.fromEntries(['diss_addressing','text_approach','genre_profile','sound_aesthetic'].map(k=>[k,{weight:.25,target:1}]))};a.facts=Object.keys(f.axes).map(k=>({id:k,key:'format.'+k,value:.2}));
 for(const [adherence,raw] of [[0,7.2],[.3,6.84],[1,6]]){const result=evaluateTrack(a,{...j(),formatAdherence:adherence},f);near(result.raw,raw);assert.ok(result.formatPenalty<=1.5);}
 const r=evaluateTrack(a,{...j(),formatAdherence:.3,strictnessOffset:-.4},f);near(r.raw,6.84);assert.equal(r.grade,6.5);
});
test('unknown axes excluded, not zero; current skills never replace saved qualities',()=>{
 const a=v('a',[null,8,4,null]);a.skills={text:100};const r=evaluateTrack(a,j(),null);assert.equal(r.raw,6);assert.equal(r.limitedEvidence,true);assert.equal(evaluateTrack(v('empty',[null,null,null,null]),j(),null).ok,false);
});
test('source knowledge and recognizable reference are separate; unknown is not a penalty',()=>{
 const ref=REFERENCE_CATALOG.find(r=>r.group==='literature'),a=v('a',[5,5,5,5]);a.facts=[{id:'ref',key:'text.reference',value:[{referenceId:ref.id,sourceId:ref.sourceId,clarity:1,fit:.8,placement:'body'}]}];const known={...j(),knowledge:{sourceIds:[ref.sourceId]}};
 assert.equal(perceiveTrack(a,known,[],REFERENCE_CATALOG).recognizedReferences.length,1);assert.equal(perceiveTrack(a,j(),[],REFERENCE_CATALOG).recognizedReferences.length,0);assert.equal(evaluateTrack(a,known,null).raw,evaluateTrack(a,j(),null).raw);a.facts[0].value[0].clarity=0;assert.equal(perceiveTrack(a,known,[],REFERENCE_CATALOG).recognizedReferences.length,0);
});
