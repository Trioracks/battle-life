import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture,legacySubmissionFixture} from './helpers/submission-fixtures.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState,VIRTUAL_PC_STORAGE_KEY as KEY} from '../src/virtual-pc-state.js';
import {normalizeBattleSubmissions,submitBattleTrack,submissionCandidates} from '../src/battle-submission.js';
import {BATTLE_BRIEFS} from '../src/virtual-pc-catalog.js';
test('legacy API cannot submit or replace outside a community dialog',()=>{
 const s=submissionFixture();for(const replace of [false,true]){const r=submitBattleTrack(s,{battleId:'makarevich-1',projectId:'beat',gameDay:2,replace});assert.equal(r.ok,false);assert.equal(r.state,s);assert.match(r.reason,/сообщества/);}
});
test('archived retired submission retains its exact snapshot and explains unavailable audio',()=>{
 const s=legacySubmissionFixture();s.battleSubmissions[0].track.drumId='shop-01';const original=structuredClone(s.battleSubmissions[0]),loaded=createVirtualPcState(s);
 assert.match(loaded.battleSubmissions[0].issue,/источник.*недоступен/i);assert.deepEqual(loaded.battleSubmissions[0].recoveryData,original);assert.deepEqual(createVirtualPcState(loaded),loaded);
});
test('legacy snapshot survives edits deletion and normalization without using current project',()=>{
 const s=legacySubmissionFixture(),old=structuredClone(s.battleSubmissions[0]);s.projects[0].name='Переписанный';s.projects=[];
 const loaded=createVirtualPcState(s);assert.deepEqual(loaded.battleSubmissions[0].track,old.track);assert.deepEqual(loaded.battleSubmissions[0].lyrics,old.lyrics);assert.deepEqual(createVirtualPcState(loaded),loaded);
});
test('legacy missing text is visibly unknown; unrelated text is quarantined',()=>{
 const s=legacySubmissionFixture();s.battleSubmissions[0].lyrics=null;assert.equal(normalizeBattleSubmissions(s.battleSubmissions)[0].topicMatch,null);
 s.battleSubmissions[0].lyrics=structuredClone(s.projects[0]);s.battleSubmissions[0].lyrics.id='foreign';assert.ok(normalizeBattleSubmissions(s.battleSubmissions)[0].issue);
});
test('corrupt metadata retained, submission backup quota prevents overwrite',()=>{
 const raw={version:89,battleId:'makarevich-1',track:{mystery:true}},s=createVirtualPcState({battleSubmissions:[raw]});
 assert.deepEqual(s.battleSubmissions[0].recoveryData,raw);assert.deepEqual(createVirtualPcState(s),s);
 const legacy=submissionFixture();delete legacy.battleSubmissions;const json=JSON.stringify(legacy),data=new Map([[KEY,json]]),storage={getItem:k=>data.get(k)??null,setItem(k,v){if(k.endsWith('-before-battle-submissions'))throw Error('quota');data.set(k,v);}};
 assert.equal(saveVirtualPcState(storage,legacy),false);assert.equal(data.get(KEY),json);assert.equal(loadVirtualPcState(storage).reason,'battle-submissions-backup-failed');
});
test('candidate lists actual duration and rejects invalid bank or missing vocal',()=>{
 assert.equal(submissionCandidates(submissionFixture(),'makarevich-1')[0].seconds,32/3);
 assert.match(submissionCandidates(submissionFixture({vocal:false}),'makarevich-1')[0].issue,/вокала/);
 const s=submissionFixture();s.projects[1].audio.themeId='missing';assert.ok(submissionCandidates(s,'makarevich-1')[0].issue);
});
for(const id of ['makarevich-1','concrete-echo'])test(id+' rules accept demo four/eight bars',()=>{const rules=BATTLE_BRIEFS.find(b=>b.id===id).rules.join(' ');assert.match(rules,/4.*8.*такт/);assert.doesNotMatch(rules,/60 до 120/);});
