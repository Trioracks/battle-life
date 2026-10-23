import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioWorkspace,renderStudioTracks} from '../src/ft-studio-view.js';
import {mountBeatStudio} from '../src/beat-studio-view.js';
import {creativeWorkDescriptor,advanceCreativeWork} from '../src/home-creative-work.js';
import {createBeatWorkPanel} from '../src/beat-work-view.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
import {fixture} from './vocal-production.test.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
test('studio progressively shows draft then locked muted draft and clean vocal lanes',()=>{
 let s=fixture(),root=createStudioWorkspace(pcDocument());renderStudioTracks(root,s.projects[0]);const rows=()=>allPc(root).filter(n=>n.dataset.ftRole==='track-label');assert.equal(rows().length,9);
 s=advanceVocalWork(startVocalWork(s,{beatId:'b',textId:'t',kind:'draft'}).state,1000).state;renderStudioTracks(root,s.projects[0]);assert.equal(rows().length,10);
 s=advanceVocalWork(startVocalWork(s,{beatId:'b',kind:'clean'}).state,1000).state;renderStudioTracks(root,s.projects[0]);assert.equal(rows().length,11);assert.ok(allPc(root).some(n=>n.dataset.muted==='true'));assert.ok(rows().some(n=>n.textContent.includes('Clean Vocal')));
 assert.equal(allPc(root).filter(n=>n.tagName==='IMG'&&n.getAttribute('src')?.endsWith('/microphone.svg?rev=35')).length,2);
});
test('add vocal lists only the latest completed lyric revision and begins its real saved work job',()=>{
 let state=fixture(),work=0;const d=pcDocument(),root=d.createElement('section');
 state.projects.push({...structuredClone(state.projects.find(p=>p.id==='t')),id:'new-text',revision:3,contentSource:{id:'t',revision:1}});
 const view=mountBeatStudio(root,{getState:()=>state,getMetadata:()=>({skills:{flow:10}}),onChange:s=>state=s,onWork:()=>{work++;return true;},audio:{unlock:async()=>{},stop(){},getSnapshot:()=>({status:'stopped'})},initialProject:state.projects[0]});
 const add=findButton(root,'Добавить вокал');assert.ok(add);add.click();const rows=allPc(root).filter(n=>n.dataset.projectId);assert.equal(rows.length,1);assert.equal(rows[0].dataset.projectId,'new-text');assert.match(rows[0].textContent,/Текст.*v3/);
 rows[0].click();assert.equal(state.recording.job.kind,'draft');assert.equal(state.recording.job.output.text.revision,3);assert.equal(state.recording.job.output.text.id,'new-text');assert.equal(work,1);view.dispose();
});
test('work routing advances recording, displays flow meter and no genre practice',()=>{
 let s=startVocalWork(fixture(),{beatId:'b',textId:'t',kind:'draft'}).state;
 const descriptor=creativeWorkDescriptor(s,{flow:10});assert.equal(descriptor.recording,true);assert.equal(descriptor.skill,10);
 assert.equal(descriptor.performance,'rapping');
 const r=advanceCreativeWork(s,1);assert.ok(r.state.recording.job.elapsed>0);assert.ok(r.state.recording.practice.flow>0);
 const panel=createBeatWorkPanel(pcDocument());panel.update({beat:descriptor.project,job:descriptor.job,skill:10.04});
 assert.ok(allPc(panel.element).some(n=>n.textContent?.replace(/\s+/g,' ').includes('Флоу 10.04')));assert.ok(allPc(panel.element).some(n=>n.textContent==='Черновая запись'));panel.dispose();
});

test('only draft and clean recording use a mic performance',()=>{
 let s=fixture();
 for(const kind of ['draft','clean','mix','master']){
  s=startVocalWork(s,{beatId:'b',textId:'t',kind}).state;
  assert.equal(creativeWorkDescriptor(s).performance,['draft','clean'].includes(kind)?'rapping':'typing');
  s=advanceVocalWork(s,1000).state;s.music.needs={satiety:100,energy:100};
 }
});
