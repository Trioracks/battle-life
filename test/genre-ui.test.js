import test from 'node:test';
import assert from 'node:assert/strict';
import {mountBeatStudio} from '../src/beat-studio-view.js';
import {createBeatWorkPanel} from '../src/beat-work-view.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createBeat} from '../src/beat-production.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
function setup(skill=10){
 const d=pcDocument(),root=d.createElement('div');let state=createVirtualPcState();
 const studio=mountBeatStudio(root,{getState:()=>state,getMetadata:()=>({skills:{beatmaking:skill},gameDay:1}),onChange:s=>{state=s;},audio:{stop(){},getSnapshot(){return{};}}});
 return {root,studio,get state(){return state;}};
}
const byLabel=(root,label)=>allPc(root).find(n=>n.getAttribute('aria-label')===label);
test('novice sees fixed experimental and no locked selector; sliders appear at exactly25',()=>{
 for(const skill of [10,24.99,25]){
  const s=setup(skill);findButton(s.root,'Новый проект').click();
  assert.ok(allPc(s.root).some(n=>n.textContent==='Жанр: Экспериментальный'));assert.equal(byLabel(s.root,'Жанр проекта'),undefined);
  byLabel(s.root,'Название бита').value='B';findButton(s.root,'Начать проект').click();
  assert.equal(s.state.projects[0].genre,'experimental');assert.equal(allPc(s.root).filter(n=>n.type==='range').length,skill<25?0:3);
  assert.ok(allPc(s.root).some(n=>n.dataset.ftRole==='genre-summary'&&n.textContent.includes('0.00 / 75')));s.studio.dispose();
 }
});
test('genre permanent choice has cancel and explicit confirmation and becomes new-project option',()=>{
 const s=setup(25);findButton(s.root,'Закрыть').click();findButton(s.root,'Жанры').click();
 findButton(s.root,'Выбрать: Бум-бэп').click();findButton(s.root,'Отмена').click();assert.deepEqual(s.state.music.genres.chosen,[]);
 findButton(s.root,'Жанры').click();findButton(s.root,'Выбрать: Бум-бэп').click();findButton(s.root,'Подтвердить выбор').click();
 assert.deepEqual(s.state.music.genres.chosen,['boombap']);
 findButton(s.root,'Новый проект').click();const select=byLabel(s.root,'Жанр проекта');assert.ok(select);
 select.value='boombap';fire(select,'change');byLabel(s.root,'Название бита').value='Boom';findButton(s.root,'Начать проект').click();
 assert.equal(s.state.projects[0].genre,'boombap');s.studio.dispose();
});
test('primary specialization is explicit and cannot be selected twice',()=>{
 const s=setup(100);findButton(s.root,'Закрыть').click();findButton(s.root,'Жанры').click();
 findButton(s.root,'Специализация: Экспериментальный').click();assert.ok(allPc(s.root).some(n=>n.textContent?.includes('до 100')));
 findButton(s.root,'Подтвердить выбор').click();assert.equal(s.state.music.genres.primary,'experimental');
 findButton(s.root,'Жанры').click();assert.equal(findButton(s.root,'Специализация: Экспериментальный'),undefined);s.studio.dispose();
});
test('work HUD shows separate genre progress only during beat work',()=>{
 const panel=createBeatWorkPanel(pcDocument()),model={beat:{kind:'beat',genre:'experimental'},job:{stage:0,total:60,elapsed:30,skill:10,genreSkill:0},skill:10+1/6,genreProgress:{name:'Экспериментальный',xp:1/6,cap:75}};
 panel.update(model);let nodes=allPc(panel.element);const meter=nodes.find(n=>n.dataset.workRole==='genre-progress');assert.ok(meter);assert.equal(meter.value,1/6);assert.equal(meter.max,1);
 assert.ok(nodes.some(n=>n.dataset.workRole==='genre'&&n.textContent.includes('/ 75')));
 panel.update({...model,beat:{kind:'lyrics'},job:{kind:'stage',stage:0}});assert.equal(allPc(panel.element).some(n=>n.dataset.workRole==='genre-progress'),false);
 panel.update({...model,job:{kind:'draft',output:{draft:{}}}});assert.equal(allPc(panel.element).some(n=>n.dataset.workRole==='genre-progress'),false);
});
