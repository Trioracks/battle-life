import test from 'node:test';
import assert from 'node:assert/strict';
import {longCampaignFixture} from './helpers/long-campaign-fixture.js';
import {createLyric} from '../src/lyric-production.js';
import {createBeat,advanceBeatWork} from '../src/beat-production.js';
import {startCreativeChain,creativeChainProgress} from '../src/creative-workflow.js';
import {advanceCreativeWork,creativeWorkDescriptor} from '../src/home-creative-work.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';

function currentWork(kind='lyrics'){
 const f=longCampaignFixture();
 const created=(kind==='beat'?createBeat:createLyric)(f.state,{id:'current',name:'Текущая работа',gameDay:8},f.skills,()=>.4);
 assert.equal(created.ok,true);
 const started=startCreativeChain(created.state,{kind,projectId:'current',gameDay:8},f.skills,()=>.4);
 assert.equal(started.ok,true);
 return {...f,state:started.state};
}

// A full-history normalization would read the unrelated paused jobs here.
test('progress reads only the requested plan',()=>{
 const {state}=currentWork();let unrelatedPausedJobReads=0;
 for(const item of state.creativeWork.items.filter(i=>i.projectId!=='current')){
  Object.defineProperty(item,'pausedJob',{get(){unrelatedPausedJobReads++;return null;},enumerable:true});
 }
 assert.deepEqual(creativeChainProgress(state,'current'),{overall:0,stage:0,index:0,count:3});
 assert.equal(unrelatedPausedJobReads,0);
});

// Re-normalizing every project to validate one active job would touch sections.
test('active work does not normalize archived lyric sections',()=>{
 const {state,skills}=currentWork();let archivedSectionReads=0;
 for(const project of state.projects.filter(p=>p.kind==='lyrics'&&p.id!=='current')){
  const sections=project.sections;
  Object.defineProperty(project,'sections',{get(){archivedSectionReads++;return sections;},enumerable:true});
 }
 const result=advanceCreativeWork(state,1,{day:8,minutes:720},skills);
 assert.equal(result.state.writing.job.elapsed,7.5);
 assert.equal(archivedSectionReads,0);
});

test('music job validation reads only the selected beat',()=>{
 const {state}=currentWork('beat');let archivedAudioReads=0;
 for(const project of state.projects.filter(p=>p.kind==='beat'&&p.id!=='current')){
  const audio=project.audio;
  Object.defineProperty(project,'audio',{get(){archivedAudioReads++;return audio;},enumerable:true});
 }
 const result=advanceBeatWork(state,1);
 assert.equal(result.state.music.job.elapsed,1);
 assert.equal(archivedAudioReads,0);
});

test('twenty completed works retain plans and exact progress',()=>{
 const {state,skills}=currentWork(),history=structuredClone(state.projects.slice(0,40)),plans=structuredClone(state.creativeWork.items.slice(0,40));
 assert.equal(history.length,40);assert.equal(plans.length,40);
 for(const project of history){
  assert.equal(project.stages.length,3);
  assert.deepEqual(creativeChainProgress(state,project.id),{overall:1,stage:1,index:2,count:3});
 }
 const advanced=advanceCreativeWork(state,4,{day:8,minutes:720},skills).state;
 assert.deepEqual(creativeWorkDescriptor(advanced,skills).chainProgress,{overall:1/6,stage:.5,index:0,count:3});
 assert.deepEqual(advanced.projects.slice(0,40),history);
 assert.deepEqual(advanced.creativeWork.items.slice(0,40),plans);
 const restored=createVirtualPcState(JSON.parse(JSON.stringify(advanced)));
 assert.deepEqual(restored.projects.slice(0,40),history);
 assert.deepEqual(restored.creativeWork.items.slice(0,40),plans);
 assert.deepEqual(creativeChainProgress(restored,'current'),{overall:1/6,stage:.5,index:0,count:3});
});
