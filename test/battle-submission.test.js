import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState,VIRTUAL_PC_STORAGE_KEY as KEY} from '../src/virtual-pc-state.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
import {BATTLE_BRIEFS} from '../src/virtual-pc-catalog.js';
const api=await import('../src/battle-submission.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const submit=(s,extra={})=>{assert.equal(typeof api.submitBattleTrack,'function');return api.submitBattleTrack(s,{battleId:'makarevich-1',projectId:'beat',gameDay:2,...extra});};

test('a saved submission with a retired source retains its snapshot and explains the unavailable audio',()=>{
 const s=submit(submissionFixture()).state;s.battleSubmissions[0].track.drumId='shop-01';
 const original=structuredClone(s.battleSubmissions[0]),loaded=createVirtualPcState(s);
 assert.match(loaded.battleSubmissions[0].issue,/источник.*недоступен/i);
 assert.deepEqual(loaded.battleSubmissions[0].recoveryData,original);
 assert.deepEqual(createVirtualPcState(loaded),loaded);
});
test('registered draft accepted while registration vocal and valid date are required',()=>{
 const s=submissionFixture(),r=submit(s);assert.equal(r.ok,true);assert.equal(r.state.battleSubmissions[0].status,'pending');
 assert.equal(r.state.battleSubmissions[0].topicMatch,true);
 assert.equal(submit(submissionFixture({registered:false})).ok,false);assert.equal(submit(submissionFixture({vocal:false})).ok,false);
 for(const gameDay of [0,NaN,Infinity,1.5])assert.equal(submit(s,{gameDay}).ok,false);
 const candidates=api.submissionCandidates(s,'makarevich-1');assert.equal(candidates.length,1);assert.equal(candidates[0].seconds,32/3);
});
test('off topic allowed without changing the track quality',()=>{
 const s=submissionFixture({battleId:null}),r=submit(s);assert.equal(r.ok,true);assert.equal(r.state.battleSubmissions[0].topicMatch,false);
 assert.deepEqual(r.state.battleSubmissions[0].track,s.projects.find(p=>p.kind==='beat'));
});
test('recording and submission freeze original lyrics through edits deletion and JSON',()=>{
 const s=submissionFixture(),original=structuredClone(s.projects[0]);
 s.projects[0].name='Переписанный';s.projects[0].revision++;
 let r=submit(s);assert.deepEqual(r.state.battleSubmissions[0].lyrics,original);
 const saved=structuredClone(r.state.battleSubmissions);r.state.projects=[];
 const loaded=createVirtualPcState(JSON.parse(JSON.stringify(r.state)));assert.deepEqual(loaded.battleSubmissions,saved);
 assert.deepEqual(createVirtualPcState(loaded),loaded);
});
test('repeat is idempotent and replacing changed take requires explicit consent',()=>{
 let s=submit(submissionFixture()).state;const first=structuredClone(s.battleSubmissions);
 assert.deepEqual(submit(s,{gameDay:3}).state.battleSubmissions,first);
 s.music.needs={satiety:100,energy:100};s=advanceVocalWork(startVocalWork(s,{beatId:'beat',kind:'mix'}).state,1000).state;
 assert.equal(api.submissionCandidates(s,'makarevich-1')[0].seconds,64/3);
 const rejected=submit(s);assert.equal(rejected.ok,false);assert.deepEqual(rejected.state.battleSubmissions,first);
 const accepted=submit(s,{replace:true});assert.equal(accepted.ok,true);assert.equal(accepted.state.battleSubmissions.length,1);assert.equal(accepted.state.battleSubmissions[0].revision,2);
});
test('legacy missing or stale text association remains visibly unverified but submittable',()=>{
 let s=submissionFixture();delete s.projects[1].recording.text.snapshot;
 assert.equal(submit(s).state.battleSubmissions[0].topicMatch,true);
 s.projects[0].revision++;const r=submit(s);assert.equal(r.ok,true);assert.equal(r.state.battleSubmissions[0].topicMatch,null);assert.equal(r.state.battleSubmissions[0].lyrics,null);
 s.projects.shift();assert.equal(submit(s).ok,true);
});
test('corrupt metadata is retained and backup failure prevents overwrite',()=>{
 const raw={version:89,battleId:'makarevich-1',track:{mystery:true}};
 const s=createVirtualPcState({battleSubmissions:[raw]});assert.ok(s.battleSubmissions[0].issue);assert.deepEqual(s.battleSubmissions[0].recoveryData,raw);
 assert.deepEqual(createVirtualPcState(s),s);
 const legacy=submissionFixture();delete legacy.battleSubmissions;
 const json=JSON.stringify(legacy),data=new Map([[KEY,json]]),storage={getItem:k=>data.get(k)??null,setItem(k,v){if(k.endsWith('-before-battle-submissions'))throw Error('quota');data.set(k,v);}};
 assert.equal(saveVirtualPcState(storage,legacy),false);assert.equal(data.get(KEY),json);assert.equal(loadVirtualPcState(storage).reason,'battle-submissions-backup-failed');
});

test('invalid audio is rejected and foreign lyric metadata is quarantined',()=>{
 const s=submissionFixture();s.projects[1].audio.themeId='missing';assert.equal(submit(s).ok,false);
 const good=submit(submissionFixture()).state;good.battleSubmissions[0].lyrics.id='unrelated';
 assert.ok(createVirtualPcState(good).battleSubmissions[0].issue);
});
for(const id of ['makarevich-1','concrete-echo'])test(id+' demo rules accept the short four/eight bar format',()=>{
 const rules=BATTLE_BRIEFS.find(b=>b.id===id).rules.join(' ');
 assert.doesNotMatch(rules,/60 до 120/);assert.match(rules,/4.*8.*такт/);
});
