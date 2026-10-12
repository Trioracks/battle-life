import test from 'node:test';
import assert from 'node:assert/strict';
import {JUDGE_COMMENTS,eligibleJudgeComments,generateJudgeReview,finalizeJudgePanel,normalizeJudging} from '../src/judge-comments.js';
import {judgeProfile,JUDGE_PROFILES} from '../src/judge-profiles.js';
import {evaluateTrack,perceiveTrack} from '../src/judge-evaluation.js';
import {battleFormat} from '../src/battle-format.js';
import {REFERENCE_CATALOG} from '../src/cultural-references.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {captureTrackVersion} from '../src/track-version.js';
let fixtureVersion=null;
export function reviewFixture(id='work',quality=80,judgeId='eparhiya'){
 if(!fixtureVersion){const captured=captureTrackVersion(submissionFixture(),{projectId:'beat',nowMinute:600});fixtureVersion=captured.state.trackVersions.byId[captured.versionId];}
 const version=structuredClone(fixtureVersion);version.id=id;
 version.qualities={text:quality/10,performance:quality/10,music:quality/10,sound:quality/10};
 for(const f of version.facts)if(/^(text|vocal|music|sound)\./.test(f.key)&&Number.isFinite(f.value))f.value=quality;
 const judge=judgeProfile(judgeId),format=battleFormat('makarevich-1','selection'),evaluation=evaluateTrack(version,judge,format),perception=perceiveTrack(version,judge,[],REFERENCE_CATALOG);
 return {version,judge,format,evaluation,perception};
}
test('all thirty panels have individual banks and all 324 source rows keep every requirement',()=>{
 for(const p of JUDGE_PROFILES)assert.ok(JUDGE_COMMENTS.filter(t=>t.judgeId===p.id).length>=40,p.id);
 const source=JUDGE_COMMENTS.filter(t=>t.sourceRef?.kind==='authored-source-row');assert.equal(source.length,324);
 for(const row of source){assert.equal(row.requirements.length,row.conditions.filter(c=>c.requirement!==undefined).length);assert.ok(row.sourceRef.rowId);assert.ok(row.conditions.every(c=>c.kind));}
});
test('unknown is never good or bad; articulation claims need audibility and extra causes need explicit facts',()=>{
 const input=reviewFixture();input.version.facts=[];input.perception=perceiveTrack(input.version,input.judge,[],REFERENCE_CATALOG);
 const eligible=eligibleJudgeComments(input);assert.ok(eligible.every(t=>!t.trigger.startsWith('text.')&&!t.trigger.startsWith('music.')&&!t.trigger.startsWith('vocal.')&&!t.trigger.startsWith('sound.')));
 const low=reviewFixture('low',20);assert.ok(!eligibleJudgeComments(low).some(t=>t.trigger==='vocal.diction.bad'));
 const high=reviewFixture();assert.ok(!eligibleJudgeComments(high).some(t=>t.id==='EP-80'||t.id==='EP-75'),'no invented stress shift or syntax');
});
test('known book is not read book; recognition and fit do not create a read history',()=>{
 const input=reviewFixture('book',80,'thirty-third'),ref=REFERENCE_CATALOG.find(r=>r.group==='literature');input.judge.knowledge.sourceIds=[ref.sourceId];
 input.version.facts.push({id:'reference',key:'text.reference',value:[{referenceId:ref.id,sourceId:ref.sourceId,fit:.9,clarity:1}]});
 input.perception=perceiveTrack(input.version,input.judge,[],REFERENCE_CATALOG);assert.ok(!eligibleJudgeComments(input).some(t=>t.id==='TT-43'));
 input.judge.knowledge.readSourceIds=[ref.sourceId];assert.ok(eligibleJudgeComments(input).some(t=>t.id==='TT-43'));
 input.judge.knowledge.sourceIds=[];input.perception=perceiveTrack(input.version,input.judge,[],REFERENCE_CATALOG);assert.ok(!eligibleJudgeComments(input).some(t=>t.trigger.startsWith('text.reference')));
});
test('result is once-only; evidence belongs to version; decision precedes text and persisted reload is inert',()=>{
 const input=reviewFixture(),first=generateJudgeReview(input,{seed:41,history:[]});assert.equal(first.result.raw,input.evaluation.raw);assert.equal(first.result.trackVersionId,input.version.id);
 assert.ok(first.result.evidenceIds.every(id=>input.version.facts.some(f=>f.id===id)));assert.deepEqual(first.diagnostics.unsupportedClaims,[]);assert.ok(!/\{[^}]+\}/.test(first.result.comment));
 const again=generateJudgeReview(input,{seed:999,history:JSON.parse(JSON.stringify(first.history))});assert.deepEqual(again.result,first.result);assert.deepEqual(again.history,first.history);
 const persisted=normalizeJudging({schemaVersion:1,results:{[first.result.id]:first.result},history:first.history});assert.deepEqual(normalizeJudging(JSON.parse(JSON.stringify(persisted))),persisted);
});
test('panel waits for every expected judge and never invents qualification; duplicates cannot complete it',()=>{
 const a=generateJudgeReview(reviewFixture(),{seed:1}).result,b=generateJudgeReview(reviewFixture('work',80,'klim-propavshiy'),{seed:2}).result,options={battleId:'makarevich-1',roundId:'selection',versionIds:['work'],judgeIds:['eparhiya','klim-propavshiy']};
 assert.equal(finalizeJudgePanel({...options,results:[a,a]}).complete,false);const done=finalizeJudgePanel({...options,results:[a,b]});assert.equal(done.complete,true);assert.equal(done.totals.work,a.grade+b.grade);assert.equal(done.events[0].type,'judge-panel-complete');assert.ok(!('qualified' in done));
});
