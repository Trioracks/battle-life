import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createProfile} from '../src/avatar-v3-profile.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {pcDocument,allPc,fire} from './helpers/virtual-pc-dom.js';
const api=await import('../src/test-skills.js').catch(()=>({})),views=await import('../src/test-skills-view.js').catch(()=>({}));
function setup(onRaise){const doc=pcDocument(),root=doc.createElement('section'),returnFocus=doc.createElement('button');let profile=createProfile({name:'Тест'}),pc=createVirtualPcState(),closed=0;
 const view=views.mountTestSkills(root,{getProfile:()=>profile,getState:()=>pc,onRaise:target=>{const result=onRaise?onRaise(profile,pc,target):api.raiseTestSkill(profile,pc,target);if(result.ok){profile=result.profile;pc=result.pc;}return result;},returnFocus,onClose:()=>closed++});return {doc,root,returnFocus,view,get profile(){return profile;},get pc(){return pc;},get closed(){return closed;}};}
const button=(root,id)=>allPc(root).find(n=>n.tagName==='BUTTON'&&n.dataset.id===id);
test('test mode dialog supports repeated +1, focus trap, Escape and return focus',()=>{
 const f=setup();assert.equal(f.view.isOpen,false);f.view.open();assert.equal(f.root.getAttribute('role'),'dialog');assert.equal(f.root.getAttribute('aria-modal'),'true');assert.ok(allPc(f.root).some(n=>n.tagName==='H2'&&/Тестовый режим/.test(n.textContent)));
 const raise=button(f.root,'beatmaking');raise.focus();raise.click();raise.click();assert.equal(f.profile.skills.beatmaking,2);assert.equal(f.doc.activeElement,raise);assert.ok(allPc(f.root).some(n=>n.dataset.valueFor==='beatmaking'&&n.textContent==='2 / 100'));
 const close=allPc(f.root).find(n=>n.textContent==='Закрыть');close.focus();fire(f.root,'keydown',{key:'Tab'});assert.equal(f.doc.activeElement,button(f.root,'intelligence'));fire(f.root,'keydown',{key:'Tab',shiftKey:true});assert.equal(f.doc.activeElement,close);
 const escape=fire(f.root,'keydown',{key:'Escape'});assert.equal(escape.defaultPrevented,true);assert.equal(f.view.isOpen,false);assert.equal(f.doc.activeElement,f.returnFocus);assert.equal(f.closed,1);f.view.dispose();assert.equal(f.root.children.length,0);
});
test('storage failure shows no success for either profile or pc writes',()=>{
 for(const id of ['beatmaking','experimental']){const f=setup((p,s,target)=>api.saveTestSkill(p,s,target,{saveProfile:()=>({ok:false,error:'disk denied'}),persistPc:()=>false}));f.view.open();const before=JSON.stringify({profile:f.profile,pc:f.pc});button(f.root,id).click();assert.equal(JSON.stringify({profile:f.profile,pc:f.pc}),before);const status=allPc(f.root).find(n=>n.getAttribute('role')==='status');assert.ok(status.textContent);assert.doesNotMatch(status.textContent,/Сохранено|повышен/);assert.equal(f.view.isOpen,true);}
});
test('active jobs disable rows and reaching cap moves focus to an available control',()=>{
 const f=setup();f.profile.skills.beatmaking=99.7;f.view.open();const raise=button(f.root,'beatmaking');raise.focus();raise.click();assert.equal(f.profile.skills.beatmaking,100);assert.equal(raise.disabled,true);assert.notEqual(f.doc.activeElement,raise);
 f.pc.music.job={elapsed:0};f.view.update();assert.ok(allPc(f.root).filter(n=>n.dataset.id).every(n=>n.disabled));button(f.root,'flow').click();assert.equal(f.profile.skills.flow,0);
});
test('creator explains the real zero starting skills in both visible notes',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),note=html.match(/<p class="novice-note">([^<]*)<\/p>/)[1];assert.match(note,/с 0\./);
 const app=readFileSync(new URL('../src/apartment-app.js',import.meta.url),'utf8'),start=app.indexOf('  function selectCreatorSection('),end=app.indexOf('  function updateStats()',start),nodes=new Map();
 const $=id=>{if(!nodes.has(id))nodes.set(id,{setAttribute(){}});return nodes.get(id);};
 const select=Function('creator','$',app.slice(start,end)+';return selectCreatorSection;')({selectSection(){}},$);select('appearance');assert.match($('#creator-footer-note').textContent,/с 0\./);
});
