import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
const module=await import('../src/beat-work-view.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('lyric refinement work is labelled as refinement rather than a fourth creation stage',()=>{
 const panel=module.createBeatWorkPanel(pcDocument());panel.update({beat:{kind:'lyrics',name:'Мысль'},job:{kind:'refine',stage:3,total:60,elapsed:30},skill:20});
 assert.equal(allPc(panel.element).find(n=>n.dataset.workRole==='stage').textContent,'Доработка текста');panel.dispose();
});

test('chain panel separates overall progress from current stage',()=>{
 const panel=module.createBeatWorkPanel(pcDocument());
 panel.update({beat:{kind:'lyrics'},job:{stage:1,total:60,elapsed:30},chainProgress:{overall:.5,stage:.5,index:1,count:3}});
 const role=key=>allPc(panel.element).find(n=>n.dataset.workRole===key);
 assert.ok(role('overall'));assert.equal(role('overall').value,.5);assert.match(role('overall-number').textContent,/50%/);
 assert.equal(role('progress').value,.5);assert.match(role('stage-index').textContent,/2 \/ 3/);
});
test('panel shows actual progress, needs, skill and reward only after completion',()=>{
 assert.equal(typeof module.createBeatWorkPanel,'function');let cancel=0,enable=0;
 const panel=module.createBeatWorkPanel(pcDocument(),{onCancel:()=>cancel++,onEnableAudio:()=>enable++});
 const model={beat:{name:'Наш двор'},job:{stage:1,elapsed:25,total:100},needs:{satiety:60,energy:40},skill:14,clockLabel:'12:30',reward:0,audioError:''};
 panel.update(model);const role=key=>allPc(panel.element).find(n=>n.dataset.workRole===key);
 assert.equal(role('progress').value,.25);assert.equal(role('reward').hidden,true);assert.equal(role('satiety').value,60);assert.equal(role('energy').value,40);
 assert.match(role('stage-index').textContent,/2 \/ 3/);assert.match(role('skill').textContent,/14/);
 panel.update({...model,job:{...model.job,elapsed:100},reward:1/3});panel.update({...model,job:{...model.job,elapsed:100},reward:1/3});
 assert.equal(allPc(panel.element).filter(n=>n.dataset.workRole==='reward').length,1);assert.equal(role('reward').hidden,false);assert.match(role('reward').textContent,/\+0\.33\b/);
 panel.update({...model,audioError:'Звук выключен',needsGesture:true});assert.equal(role('reward').hidden,true);
 findButton(panel.element,'Включить звук').click();findButton(panel.element,'Прервать работу').click();assert.equal(cancel,1);assert.equal(enable,1);panel.dispose();
});

test('training exposes fractional beatmaking and stage gains without a genre meter',()=>{
 const panel=module.createBeatWorkPanel(pcDocument());
 const model={beat:{name:'Наш двор',genre:'boombap'},job:{stage:0,elapsed:30,total:60,skill:10,genreSkill:2},skill:10+1/6,genrePractice:2+1/6};
 panel.update(model);const role=key=>allPc(panel.element).find(n=>n.dataset.workRole===key);
 assert.match(role('skill').textContent,/10\.17.*→ 11/);
 assert.equal(role('skill-progress').value,10+1/6);assert.equal(role('skill-progress').min,10);assert.equal(role('skill-progress').max,11);
 assert.equal(role('skill-progress').getAttribute('aria-label'),'Битмейкинг');
 assert.match(role('skill-progress').getAttribute('aria-valuetext'),/10\.17.*до 11/);
 assert.match(role('skill-gain').textContent,/\+0\.17/);
 assert.ok(!role('genre'));assert.ok(!role('genre-progress'));assert.ok(!role('genre-gain'));
 panel.update({...model,skill:10+1/3,genrePractice:2+1/3,job:{...model.job,elapsed:60},reward:1/3});
 assert.match(role('skill').textContent,/10\.33/);assert.match(role('skill-gain').textContent,/\+0\.33/);
 assert.match(role('reward').textContent,/\+0\.33\b/);
});

test('training at the skill cap shows no fictitious gain and a completed stage still closes work controls',()=>{
 const panel=module.createBeatWorkPanel(pcDocument());
 panel.update({beat:{genre:'boombap'},job:{skill:100,genreSkill:100,total:60,elapsed:60},skill:100,genrePractice:100,finished:true,reward:0});
 const role=key=>allPc(panel.element).find(n=>n.dataset.workRole===key);
 assert.ok(role('skill-progress'),'skill progress bar is visible');assert.ok(!role('genre-progress'));
 assert.equal(role('skill-progress').value,100);
 assert.equal(role('skill-progress').min,99);assert.equal(role('skill-progress').max,100);
 assert.match(role('skill').textContent,/100\.00.*максимум/);
 assert.match(role('skill-progress').getAttribute('aria-valuetext'),/100\.00.*максимум/);
 assert.match(role('skill-gain').textContent,/\+0\.00/);
 assert.equal(role('reward').hidden,false);assert.match(role('reward').textContent,/этап завершён/i);
 assert.equal(findButton(panel.element,'Прервать работу').hidden,true);
});

test('crossing a whole skill level starts the next interval while keeping the actual stage gain',()=>{
 const panel=module.createBeatWorkPanel(pcDocument());
 const job={stage:0,elapsed:0,total:60,skill:10.9,genreSkill:2.9};
 panel.update({beat:{genre:'boombap'},job,skill:10.9,genrePractice:2.9});
 panel.update({beat:{genre:'boombap'},job:{...job,elapsed:36},skill:11.1,genrePractice:3.1});
 const role=key=>allPc(panel.element).find(n=>n.dataset.workRole===key);
 assert.equal(role('skill-progress').min,11);assert.equal(role('skill-progress').max,12);assert.equal(role('skill-progress').value,11.1);
 assert.ok(!role('genre-progress'));
 assert.match(role('skill').textContent,/11\.10.*→ 12/);
 assert.match(role('skill-gain').textContent,/\+0\.20/);
});

test('shared work panel keeps writing, flow and sound training when genre practice is retired',()=>{
 const panel=module.createBeatWorkPanel(pcDocument());
 for(const [beat,job,label]of [
  [{kind:'lyrics'},{kind:'stage',stage:0},'Письмо'],
  [{kind:'beat'},{kind:'draft',output:{draft:{}}},'Флоу'],
  [{kind:'beat'},{kind:'clean',output:{draft:{}}},'Флоу'],
  [{kind:'beat'},{kind:'mix',output:{draft:{}}},'Звук'],
  [{kind:'beat'},{kind:'master',output:{draft:{}}},'Звук'],
 ]){
  panel.update({beat,job:{...job,skill:10,total:60,elapsed:30},skill:10+1/6});
  const role=key=>allPc(panel.element).find(n=>n.dataset.workRole===key);
  assert.equal(role('skill-progress').getAttribute('aria-label'),label);
  assert.equal(role('skill-progress').value,10+1/6);assert.match(role('skill-gain').textContent,/\+0\.17/);
  assert.ok(!role('genre-progress'));
 }
});
