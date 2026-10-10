import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';
import {createBeatWorkPanel} from '../src/beat-work-view.js';
import * as work from '../src/home-creative-work.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createLyric,startLyricWork} from '../src/lyric-production.js';
test('writing HUD shows writing practice and keyboard rather than fictitious beat genre',()=>{
 const panel=createBeatWorkPanel(pcDocument());panel.update({beat:{kind:'lyrics',name:'Черновик'},job:{kind:'stage',stage:1,total:60,elapsed:30,skill:10},skill:10.16});
 const role=id=>allPc(panel.element).find(n=>n.dataset.workRole===id);
 assert.match(role('stage').textContent,/Написание рифм/);assert.match(role('skill').textContent,/Письмо/);assert.match(role('audio').textContent,/клавиатур/);assert.equal(role('genre').parentElement.hidden,true);
});
test('shared work advancement selects text job, consumes time and leaves beat practice untouched',()=>{
 assert.equal(typeof work.advanceCreativeWork,'function');
 let s=createLyric(createVirtualPcState(),{id:'text',name:'Мысль'}).state;s=startLyricWork(s,{projectId:'text'}).state;
 const r=work.advanceCreativeWork(s,4);assert.equal(r.minutes,30);assert.equal(r.state.writing.job.elapsed,30);assert.equal(r.state.music.practice,0);assert.equal(r.state.writing.practice,1/6);
 assert.equal(work.creativeWorkDescriptor(r.state).project.kind,'lyrics');
});

test('writing completion uses the live calendar after midnight, including a resumed draft',()=>{
 let s=createLyric(createVirtualPcState(),{id:'night-text',name:'Ночная мысль',gameDay:1}).state;
 s=startLyricWork(s,{projectId:'night-text',gameDay:1}).state;
 s=work.advanceCreativeWork(s,4,{day:1,minutes:1380}).state;
 s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
 const clock={day:3,minutes:1430},r=work.advanceCreativeWork(s,4,clock);
 assert.equal(r.finished,true);assert.equal(r.state.projects[0].createdDate,'01.09.2012');
 assert.equal(r.state.projects[0].updatedDate,'04.09.2012');assert.deepEqual(clock,{day:3,minutes:1430});
});
