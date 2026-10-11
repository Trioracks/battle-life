import test from 'node:test';
import assert from 'node:assert/strict';
import {mountHomeNeedsView,mountCharacterSpeech} from '../src/home-needs-view.js?rev=28';
import {createVirtualPcState} from '../src/virtual-pc-state.js?rev=28';
import {consumeFood,FOOD_CATALOG} from '../src/home-food.js?rev=28';
import {pcDocument,allPc,fire} from './helpers/virtual-pc-dom.js';
test('fridge delegates consume, updates stock, closes Escape and restores room focus',()=>{
 const doc=pcDocument(),root=doc.createElement('section'),focus=doc.createElement('canvas');let chosen='',closed=0;
 const view=mountHomeNeedsView(root,{onConsume:id=>chosen=id,onClose:()=>closed++,returnFocus:focus});
 view.open(createVirtualPcState());assert.equal(view.isOpen,true);assert.equal(root.hidden,false);
 const apple=allPc(root).find(n=>n.dataset.foodId==='apple'&&n.tagName==='BUTTON');apple.click();assert.equal(chosen,'apple');
 view.update(createVirtualPcState({household:{fridge:{}},music:{needs:{satiety:100}}}),'Сохранение недоступно');assert.equal(apple.disabled,true);assert.ok(allPc(root).some(n=>n.textContent==='Сохранение недоступно'));
 fire(root,'keydown',{key:'Escape'});assert.equal(view.isOpen,false);assert.equal(doc.activeElement,focus);assert.equal(closed,1);view.dispose();
});
test('consuming a focused fruit keeps Shift+Tab inside the dialog when its control is disabled',()=>{
 for(const [seed,nextFood]of [
  [{music:{needs:{satiety:50}}},'pear'],
  [{music:{needs:{satiety:85}}},null],
  [{music:{needs:{satiety:50}},household:{fridge:{apple:1,pear:0,banana:0}}},null],
 ]){
  const doc=pcDocument(),root=doc.createElement('section');let state=createVirtualPcState(seed);
  const foodMode={infiniteFood:false};
  const view=mountHomeNeedsView(root,{foodMode,onConsume:id=>{state=consumeFood(state,id,FOOD_CATALOG,foodMode).state;view.update(state);}});view.open(state);
  const apple=allPc(root).find(n=>n.dataset.foodId==='apple'),close=allPc(root).find(n=>n.textContent==='Закрыть');assert.equal(doc.activeElement,apple);
  apple.click();assert.equal(apple.disabled,true);assert.equal(doc.activeElement.dataset.foodId??doc.activeElement.textContent,nextFood??'Закрыть');
  fire(root,'keydown',{key:'Tab',shiftKey:true});assert.equal(doc.activeElement,close);assert.equal(view.isOpen,true);
 }
});
test('speech view clamps the head anchor, centers first person and announces a phrase only once',()=>{
 const doc=pcDocument(),root=doc.createElement('div');root.getBoundingClientRect=()=>({width:300,height:80});const view=mountCharacterSpeech(root);
 view.update({visible:true,text:'Не',fullText:'Не могу работать, хочу поесть.',serial:1},{x:-10,y:20},{width:480,height:720});
 assert.equal(root.style.left,'162px');assert.equal(root.style.top,'92px');const live=root.children[1];assert.equal(live.textContent,'Не могу работать, хочу поесть.');
 live.textContent='announced';view.update({visible:true,text:'Не могу',fullText:'Не могу работать, хочу поесть.',serial:1},{x:100,y:20},{width:480,height:720,firstPerson:true});
 assert.equal(live.textContent,'announced');assert.equal(root.style.left,'240px');assert.equal(root.style.top,'620px');
 view.update({visible:true,text:'Не могу',fullText:'Не могу работать, хочу поесть.',serial:1},null,{width:480,height:720,firstPerson:true,bottomLimit:480});assert.equal(root.style.top,'480px');
});

test('fridge exposes empty freezer and three shelves with six usable infinite food slots',()=>{
 const doc=pcDocument(),root=doc.createElement('section'),chosen=[];
 const view=mountHomeNeedsView(root,{onConsume:id=>chosen.push(id)});
 view.open(createVirtualPcState({music:{needs:{satiety:50}},household:{fridge:{}}}));
 const nodes=allPc(root),freezer=nodes.find(n=>n.dataset.fridgeCompartment==='freezer'),shelves=nodes.filter(n=>n.dataset.fridgeShelf);
 assert.ok(freezer);assert.equal(freezer.children.filter(n=>n.dataset.slot).length,3);assert.equal(allPc(freezer).some(n=>n.tagName==='BUTTON'),false);
 assert.equal(shelves.length,3);
 assert.deepEqual(shelves.map(s=>allPc(s).filter(n=>n.tagName==='BUTTON').map(n=>n.dataset.foodId)),[['apple','pear','banana'],[],['sausage','bread','cheese']]);
 assert.deepEqual(shelves.map(s=>s.children.filter(n=>n.dataset.slot).length),[3,3,3]);
 const buttons=nodes.filter(n=>n.dataset.foodId);
 for(const button of buttons){assert.equal(button.disabled,false);button.click();}
 assert.deepEqual(chosen,['apple','pear','banana','sausage','bread','cheese']);
 assert.equal(nodes.filter(n=>n.textContent==='Осталось: ∞').length,6);
 assert.ok(nodes.some(n=>/Временный тестовый режим/.test(n.textContent)));
 assert.equal(root.getAttribute('aria-modal'),'true');
});

test('infinite consume keeps the active food focused until full and retains tab and close behavior',()=>{
 const doc=pcDocument(),root=doc.createElement('section'),outside=doc.createElement('button');let state=createVirtualPcState({music:{needs:{satiety:50}},household:{fridge:{}}}),closed=0;
 const view=mountHomeNeedsView(root,{returnFocus:outside,onClose:()=>closed++,onConsume:id=>{state=consumeFood(state,id).state;view.update(state);}});view.open(state);
 const apple=allPc(root).find(n=>n.dataset.foodId==='apple'),close=allPc(root).find(n=>n.textContent==='Закрыть');
 apple.click();assert.equal(apple.disabled,false);assert.equal(doc.activeElement,apple);
 fire(root,'keydown',{key:'Tab',shiftKey:true});assert.equal(doc.activeElement,close);
 fire(root,'keydown',{key:'Tab'});assert.equal(doc.activeElement,apple);
 apple.click();assert.equal(state.music.needs.satiety,100);assert.equal(doc.activeElement,close);
 assert.ok(allPc(root).filter(n=>n.dataset.foodId).every(n=>n.disabled));
 close.click();assert.equal(view.isOpen,false);assert.equal(doc.activeElement,outside);assert.equal(closed,1);
});
