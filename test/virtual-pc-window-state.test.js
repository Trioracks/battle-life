import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindowState, reduceWindows } from '../src/virtual-pc-window-state.js';
const open=(s,id='computer')=>reduceWindows(s,{type:'open',id,appId:id,title:id});
test('maximize restores geometry without mutating its input',()=>{
  const a=createWindowState({width:1280,height:720}), b=open(a);
  const c=reduceWindows(b,{type:'toggle-maximize',id:'computer'});
  assert.deepEqual(c.windows[0].rect,{x:0,y:0,width:1280,height:688});
  assert.deepEqual(reduceWindows(c,{type:'toggle-maximize',id:'computer'}).windows[0].rect,b.windows[0].rect);
  assert.equal(a.windows.length,0);
});
test('duplicate open focuses one instance and preserves geometry',()=>{
  let s=open(open(createWindowState({width:1280,height:720})),'underweb');
  const rect=s.windows[0].rect;
  s=open(s);
  assert.equal(s.windows.length,2); assert.equal(s.activeId,'computer');
  assert.deepEqual(s.windows[0].rect,rect);
});
test('minimized maximized window restores maximized',()=>{
  let s=open(createWindowState({width:1280,height:720}));
  for(const type of ['toggle-maximize','minimize','task'])s=reduceWindows(s,{type,id:'computer'});
  assert.equal(s.windows[0].mode,'maximized');
  assert.equal(s.windows[0].rect.height,688);
});
test('closing active picks top visible window and all minimized has no active id',()=>{
  let s=open(open(createWindowState({width:1280,height:720})),'underweb');
  s=reduceWindows(s,{type:'close',id:'underweb'});
  assert.equal(s.activeId,'computer');
  s=reduceWindows(s,{type:'minimize',id:'computer'});
  assert.equal(s.activeId,null);
});
test('640 viewport starts maximized and viewport shrink keeps title reachable',()=>{
  let s=open(createWindowState({width:640,height:900}));
  assert.equal(s.windows[0].mode,'maximized');
  s=reduceWindows(s,{type:'viewport',width:400,height:300});
  assert.deepEqual(s.windows[0].rect,{x:0,y:0,width:400,height:268});
});
test('invalid geometry cannot poison state and unknown actions do nothing',()=>{
  const s=open(createWindowState({width:1280,height:720}));
  assert.strictEqual(reduceWindows(s,{type:'geometry',id:'computer',rect:{x:NaN,y:0,width:4,height:5}}),s);
  assert.strictEqual(reduceWindows(s,{type:'activate',id:'unknown'}),s);
  const small=reduceWindows(s,{type:'viewport',width:200,height:160});
  const r=small.windows[0].rect;
  assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=200&&r.y+r.height<=128);
});
