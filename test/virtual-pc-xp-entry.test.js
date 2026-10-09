import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {pcDocument,findPc,allPc,findButton} from './helpers/virtual-pc-dom.js';
function setup(callbacks={}){const d=pcDocument(),root=d.createElement('section');const c=mountVirtualPc(root,{audio:{stop(){},dispose(){}},...callbacks});return {d,root,c};}
test('host metadata updates clock without touching inputs or leave-return forms',()=>{
  const {c,root}=setup();c.showDesktop(createVirtualPcState());c.open('underweb');
  const input=allPc(root).find(n=>n.tagName==='INPUT');input.value='Незавершённый ввод';
  c.syncHost({playerName:'Саша',clockLabel:'16:00'});assert.equal(findPc(root,'clock').textContent,'16:00');
  assert.equal(allPc(root).find(n=>n.tagName==='INPUT')===input,true);
  c.requestLeave();c.showDesktop(c.state);assert.equal(allPc(root).find(n=>n.tagName==='INPUT')===input,true);
  assert.equal(input.value,'Незавершённый ввод');findButton(root,'Пуск').click();assert.ok(allPc(root).some(n=>n.textContent==='Саша'));
});
test('new game resets icons and windows alongside PC',()=>{
  const {c}=setup();c.showDesktop(createVirtualPcState({desktopIcons:{computer:{x:240,y:200}}}));c.open('computer');
  c.reset(createVirtualPcState());c.showDesktop(c.state);assert.deepEqual(c.state.desktopIcons,{});assert.equal(c.windows.windows.length,0);
});
test('boot completes with XP chrome in 5500ms',()=>{
  const timers=[];const {c,root}=setup({setTimeoutFn:(fn,delay)=>{timers.push({fn,delay});return timers.length;},clearTimeoutFn:()=>{}});
  c.boot(createVirtualPcState());assert.ok(allPc(root).some(n=>n.textContent==='Windows XP'));
  let elapsed=0;while(timers.length){const t=timers.shift();elapsed+=t.delay;t.fn();}
  assert.equal(elapsed,5500);assert.equal(c.phase,'desktop');assert.ok(findButton(root,'Пуск'));
});
test('entry loads versioned XP stylesheet and module, and host feeds game metadata',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),app=await readFile(new URL('../src/apartment-app.js',import.meta.url),'utf8');
  assert.match(html,/apartment-app\.js\?rev=17/);assert.match(html,/virtual-pc\.css\?rev=17/);
  assert.match(app,/virtual-pc-ui\.js\?rev=17/);assert.match(app,/syncHost\(\{playerName:profile\?\.name/);
});
