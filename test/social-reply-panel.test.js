import test from 'node:test';
import assert from 'node:assert/strict';
import {mountReplyPanel} from '../src/social-reply-panel.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
test('Answer opens a useful panel with no choices and selecting a choice never sends automatically',()=>{
 const d=pcDocument(),root=d.createElement('main');let context={choices:[],hint:'Сначала установи блокнот.'},chosen=null,sent=0;
 const panel=mountReplyPanel(root,{getContext:()=>context,onChoose:(id,body)=>chosen={id,body},onSend:()=>sent++});root.append(panel.answer,panel.send);assert.equal(panel.answer.disabled,false);panel.answer.click();assert.ok(allPc(root).some(n=>n.textContent===context.hint));
 context={choices:[['first','Хорошо! Сам как?']],hint:'Выбери ответ.'};panel.update();findButton(root,'Хорошо! Сам как?').click();assert.deepEqual(chosen,{id:'first',body:'Хорошо! Сам как?'});assert.equal(sent,0);panel.send.click();assert.equal(sent,1);panel.dispose();
});
