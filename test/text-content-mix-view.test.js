import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createLyric} from '../src/lyric-production.js';
import {mountRapNotebook} from '../src/rap-notebook-view.js';
function fixture(practice=0){const d=pcDocument(),root=d.createElement('main');let s=createLyric(createVirtualPcState(),{id:'x',name:'Черновик'},{writing:24},()=>.3).state;s.writing.practice=practice;const view=mountRapNotebook(root,{getState:()=>s,getMetadata:()=>({skills:{writing:24},gameDay:1}),onChange:n=>s=n,onWork:()=>true});return{root,view,get state(){return s;}};}
const inputs=f=>allPc(f.root).filter(n=>n.dataset.contentMixKey);
test('24 hides manual composition;25 through practice shows conserved linked controls and freezes on start',()=>{
 const low=fixture();assert.equal(inputs(low).length,0);
 const high=fixture(1);assert.equal(inputs(high).length,3);const topic=inputs(high).find(n=>n.dataset.contentMixKey==='topic');topic.value='80';fire(topic,'change');
 assert.equal(high.state.projects[0].contentMix.topic,80);assert.equal(inputs(high).reduce((sum,n)=>sum+Number(n.value),0),100);
 fire(findButton(high.root,'Начать писать'),'click');assert.equal(inputs(high).length,0);
});
test('started composition keeps its budget and ready work offers bounded refinement',()=>{
 const f=fixture(1),old=structuredClone(f.state.projects[0]);f.state.projects[0].stages=[{skill:25,quality:25,sliders:[5,5,5]}];f.view.update();
 assert.equal(inputs(f).length,0);assert.ok(!findButton(f.root,'Новая содержательная версия'));
 f.state.projects[0].stages=Array.from({length:3},()=>({skill:25,quality:20,sliders:[5,5,5]}));f.view.update();fire(findButton(f.root,'Доработать'),'click');
 assert.equal(f.state.projects.length,1);assert.equal(f.state.writing.job.kind,'refine');assert.deepEqual(f.state.projects[0].contentMix,old.contentMix);
});
