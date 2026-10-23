import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mountVirtualPc} from '../src/virtual-pc-ui.js?rev=32';
import {createVirtualPcState} from '../src/virtual-pc-state.js?rev=28';
import {PcTransition} from '../src/virtual-pc-transition.js';
import {pcDocument,findPc,allPc,findButton} from './helpers/virtual-pc-dom.js';
function setup(callbacks={}){const d=pcDocument(),root=d.createElement('section');const c=mountVirtualPc(root,{audio:{stop(){},dispose(){}},...callbacks});return {d,root,c};}
test('host metadata updates clock without touching inputs or leave-return forms',()=>{
  const {c,root}=setup();c.showDesktop(createVirtualPcState());c.open('underweb');
  const input=allPc(root).find(n=>n.tagName==='INPUT');input.value='Незавершённый ввод';
  c.syncHost({playerName:'Саша',clockLabel:'16:00'});assert.equal(allPc(findPc(root,'clock')).find(n=>n.tagName==='TIME').textContent,'16:00');
  assert.equal(allPc(root).find(n=>n.tagName==='INPUT')===input,true);
  c.requestLeave();c.showDesktop(c.state);assert.equal(allPc(root).find(n=>n.tagName==='INPUT')===input,true);
  assert.equal(input.value,'Незавершённый ввод');findButton(root,'Слобода').click();assert.ok(allPc(root).some(n=>n.textContent==='Саша'));
});
test('new game resets icons and windows alongside PC',()=>{
  const {c}=setup();c.showDesktop(createVirtualPcState({desktopIcons:{computer:{x:240,y:200}}}));c.open('computer');
  c.reset(createVirtualPcState());c.showDesktop(c.state);assert.deepEqual(c.state.desktopIcons,{});assert.equal(c.windows.windows.length,0);
});

test('computer date tracks the shared game day and leaves clock text readable',()=>{
 const {c,root}=setup();c.showDesktop(createVirtualPcState());
 c.syncHost({playerName:'Саша',clockLabel:'23:59',gameDay:30});
 assert.equal(allPc(findPc(root,'clock')).find(n=>n.tagName==='TIME').textContent,'23:59');assert.match(findPc(root,'clock').getAttribute('title'),/30\.09\.2012/);assert.equal(findPc(root,'clock').tagName,'BUTTON');
 c.syncHost({playerName:'Саша',clockLabel:'00:00',gameDay:31});
 assert.match(findPc(root,'clock').getAttribute('title'),/01\.10\.2012/);c.dispose();
});
test('host controller owns the eleven second cold boot with no DOM timer',()=>{
  const timers=[];const {c,root}=setup({setTimeoutFn:(fn,delay)=>{timers.push({fn,delay});return timers.length;},clearTimeoutFn:()=>{}});
  c.boot(createVirtualPcState());const t=new PcTransition();t.enter();t.tick(3.6);c.presentTransition(t.snapshot);assert.ok(allPc(root).some(n=>n.textContent==='Слобода OS'));
  assert.equal(timers.length,0);t.tick(7.4);c.presentTransition(t.snapshot);assert.equal(root.dataset.pcTransition,'desktop');assert.ok(findButton(root,'Слобода'));
});
test('entry loads versioned Sloboda stylesheet and module, and host feeds game metadata',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),app=await readFile(new URL('../src/apartment-app.js?rev=32',import.meta.url),'utf8');
  assert.match(html,/apartment-app\.js\?rev=57/);assert.match(html,/virtual-pc\.css\?rev=43/);
  assert.match(html,/desktop-apps\.css\?rev=43/);
  assert.match(app,/virtual-pc-ui\.js\?rev=57/);assert.match(app,/syncHost\(\{playerName:profile\?\.name/);
});
