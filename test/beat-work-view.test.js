import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
const module=await import('../src/beat-work-view.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('panel shows actual progress, needs, skill and reward only after completion',()=>{
 assert.equal(typeof module.createBeatWorkPanel,'function');let cancel=0,enable=0;
 const panel=module.createBeatWorkPanel(pcDocument(),{onCancel:()=>cancel++,onEnableAudio:()=>enable++});
 const model={beat:{name:'Наш двор'},job:{stage:1,elapsed:25,total:100},needs:{satiety:60,energy:40},skill:14,clockLabel:'12:30',reward:0,audioError:''};
 panel.update(model);const role=key=>allPc(panel.element).find(n=>n.dataset.workRole===key);
 assert.equal(role('progress').value,.25);assert.equal(role('reward').hidden,true);assert.equal(role('satiety').value,60);assert.equal(role('energy').value,40);
 assert.match(role('stage').textContent,/2 \/ 3/);assert.match(role('skill').textContent,/14/);
 panel.update({...model,job:{...model.job,elapsed:100},reward:1/3});panel.update({...model,job:{...model.job,elapsed:100},reward:1/3});
 assert.equal(allPc(panel.element).filter(n=>n.dataset.workRole==='reward').length,1);assert.equal(role('reward').hidden,false);assert.match(role('reward').textContent,/\+0\.33\b/);
 panel.update({...model,audioError:'Звук выключен',needsGesture:true});assert.equal(role('reward').hidden,true);
 findButton(panel.element,'Включить звук').click();findButton(panel.element,'Прервать работу').click();assert.equal(cancel,1);assert.equal(enable,1);panel.dispose();
});

test('training bars expose the actual fractional skill, genre practice and gains for this stage',()=>{
 const panel=module.createBeatWorkPanel(pcDocument());
 const model={beat:{name:'Наш двор',genre:'boombap'},job:{stage:0,elapsed:30,total:60,skill:10,genreSkill:2},skill:10+1/6,genrePractice:2+1/6};
 panel.update(model);const role=key=>allPc(panel.element).find(n=>n.dataset.workRole===key);
 assert.match(role('skill').textContent,/10\.17.*до 11/);
 assert.equal(role('skill-progress').value,10+1/6);assert.equal(role('skill-progress').min,10);assert.equal(role('skill-progress').max,11);
 assert.equal(role('skill-progress').getAttribute('aria-label'),'Битмейкинг');
 assert.match(role('skill-progress').getAttribute('aria-valuetext'),/10\.17.*до 11/);
 assert.match(role('skill-gain').textContent,/\+0\.17/);
 assert.match(role('genre').textContent,/Бум-бэп.*2\.17.*до 3/);
 assert.equal(role('genre-progress').value,2+1/6);assert.equal(role('genre-progress').min,2);assert.equal(role('genre-progress').max,3);
 assert.match(role('genre-progress').getAttribute('aria-label'),/Бум-бэп/);
 assert.match(role('genre-progress').getAttribute('aria-valuetext'),/2\.17.*до 3/);
 assert.match(role('genre-gain').textContent,/\+0\.17/);
 panel.update({...model,skill:10+1/3,genrePractice:2+1/3,job:{...model.job,elapsed:60},reward:1/3});
 assert.match(role('skill').textContent,/10\.33/);assert.match(role('skill-gain').textContent,/\+0\.33/);
 assert.match(role('genre-gain').textContent,/\+0\.33/);assert.match(role('reward').textContent,/\+0\.33\b/);
});

test('training at the skill cap shows no fictitious gain and a completed stage still closes work controls',()=>{
 const panel=module.createBeatWorkPanel(pcDocument());
 panel.update({beat:{genre:'boombap'},job:{skill:100,genreSkill:100,total:60,elapsed:60},skill:100,genrePractice:100,finished:true,reward:0});
 const role=key=>allPc(panel.element).find(n=>n.dataset.workRole===key);
 assert.ok(role('skill-progress'),'skill progress bar is visible');assert.ok(role('genre-progress'),'genre progress bar is visible');
 assert.equal(role('skill-progress').value,100);assert.equal(role('genre-progress').value,100);
 for(const key of ['skill','genre']){
  assert.equal(role(key+'-progress').min,99);assert.equal(role(key+'-progress').max,100);
  assert.match(role(key).textContent,/100\.00.*максимум/);
  assert.match(role(key+'-progress').getAttribute('aria-valuetext'),/100\.00.*максимум/);
 }
 assert.match(role('skill-gain').textContent,/\+0\.00/);assert.match(role('genre-gain').textContent,/\+0\.00/);
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
 assert.equal(role('genre-progress').min,3);assert.equal(role('genre-progress').max,4);assert.equal(role('genre-progress').value,3.1);
 assert.match(role('skill').textContent,/11\.10.*до 12/);assert.match(role('genre').textContent,/3\.10.*до 4/);
 assert.match(role('skill-gain').textContent,/\+0\.20/);assert.match(role('genre-gain').textContent,/\+0\.20/);
});
