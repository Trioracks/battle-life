import test from 'node:test';
import assert from 'node:assert/strict';
import {mountHomeNeedsView,mountCharacterSpeech} from '../src/home-needs-view.js?rev=27';
import {createVirtualPcState} from '../src/virtual-pc-state.js?rev=27';
import {consumeFood} from '../src/home-food.js?rev=27';
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
  const view=mountHomeNeedsView(root,{onConsume:id=>{state=consumeFood(state,id).state;view.update(state);}});view.open(state);
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
