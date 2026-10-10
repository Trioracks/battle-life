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
 panel.update({...model,job:{...model.job,elapsed:100},reward:1});panel.update({...model,job:{...model.job,elapsed:100},reward:1});
 assert.equal(allPc(panel.element).filter(n=>n.dataset.workRole==='reward').length,1);assert.equal(role('reward').hidden,false);assert.match(role('reward').textContent,/\+1/);
 panel.update({...model,audioError:'Звук выключен',needsGesture:true});assert.equal(role('reward').hidden,true);
 findButton(panel.element,'Включить звук').click();findButton(panel.element,'Прервать работу').click();assert.equal(cancel,1);assert.equal(enable,1);panel.dispose();
});
