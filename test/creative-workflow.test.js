import test from 'node:test';
import assert from 'node:assert/strict';
import {creativeFixture} from './helpers/creative-fixtures.js';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js';
import {advanceLyricWork} from '../src/lyric-production.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState,VIRTUAL_PC_STORAGE_KEY as KEY} from '../src/virtual-pc-state.js';
const api=await import('../src/creative-workflow.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
function start(f){assert.equal(typeof api.startCreativeChain,'function');return api.startCreativeChain(f.state,{kind:f.state.projects[0].kind,projectId:f.projectId},f.skills,()=>.4);}
for(const kind of ['beat','lyrics']){
 test(kind+' repeat start preserves plan and pause resume keeps ledger',()=>{
  const f=creativeFixture(kind),r=start(f);assert.equal(r.ok,true);
  const again=api.startCreativeChain(r.state,{kind,projectId:f.projectId},f.skills,()=>.99);
  assert.deepEqual(again.state,r.state);
  const advanced=(kind==='beat'?advanceBeatWork:advanceLyricWork)(r.state,20).state;
  const owner=kind==='beat'?'music':'writing',before=structuredClone(advanced[owner]);
  const paused=api.pauseCreativeChain(advanced);assert.equal(paused[owner].job,null);
  assert.deepEqual(paused.creativeWork.items[0].pausedJob,before.job);
  const restored=createVirtualPcState(JSON.parse(JSON.stringify(paused)));
  assert.deepEqual(createVirtualPcState(restored),restored);
  const resumed=api.startCreativeChain(restored,{kind,projectId:f.projectId},f.skills,()=>.99);
  assert.deepEqual(resumed.state[owner],before);
  assert.equal(api.creativeChainProgress(resumed.state,f.projectId).count,3);
 });
}
test('legacy job adoption preserves elapsed skill sliders and credits',()=>{
 const f=creativeFixture('beat');let s=startBeatStage(f.state,f.projectId,[2,3,4],f.skills).state;
 s.music.job.total=60;s=advanceBeatWork(s,30).state;const old=structuredClone(s.music);
 f.state=s;const r=start(f);assert.deepEqual(r.state.music,old);
 assert.equal(r.state.creativeWork.items[0].plans[0].total,60);
});
test('switch paused projects and reject conflicting active work atomically',()=>{
 const f=creativeFixture('beat'),a=start(f).state;
 const paused=api.pauseCreativeChain(advanceBeatWork(a,10).state);
 const b=createBeat(paused,{id:'second',name:'Второй'},f.skills,()=>.2).state;
 const running=api.startCreativeChain(b,{kind:'beat',projectId:'second'},f.skills).state;
 const rejected=api.startCreativeChain(running,{kind:'beat',projectId:f.projectId},f.skills);
 assert.equal(rejected.ok,false);assert.deepEqual(rejected.state,running);
 const back=api.startCreativeChain(api.pauseCreativeChain(running),{kind:'beat',projectId:f.projectId},f.skills);
 assert.equal(back.ok,true);assert.equal(back.state.music.job.elapsed,10);
});
test('creative migration backup quota failure leaves original save untouched',()=>{
 const s=creativeFixture('beat').state;delete s.creativeWork;
 const raw=JSON.stringify(s),data=new Map([[KEY,raw]]);
 const storage={getItem:k=>data.get(k)??null,setItem(k,v){if(k===KEY+'-before-creative-work')throw Error('quota');data.set(k,v);}};
 assert.equal(saveVirtualPcState(storage,s),false);assert.equal(data.get(KEY),raw);
 assert.equal(loadVirtualPcState(storage).reason,'creative-work-backup-failed');
});
test('malformed projects are retained for explanation',()=>{
 const raw={id:'broken',kind:'beat',name:'Старый',version:888};
 const s=createVirtualPcState({projects:[raw]});assert.equal(s.projects.length,1);assert.ok(s.projects[0].recoveryIssue);
 assert.deepEqual(s.projects[0].recoveryData,raw);
 assert.deepEqual(createVirtualPcState(s),s);
});
