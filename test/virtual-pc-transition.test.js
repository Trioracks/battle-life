import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/virtual-pc-transition.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
function controller(){assert.equal(typeof api.PcTransition,'function','PC lifecycle controller exists');return new api.PcTransition();}
const events=c=>c.drainEvents().map(e=>e.type);

test('cold boot crosses four stages once and reaches desktop at eleven seconds',()=>{
  const c=controller();assert.equal(c.enter({alreadyOn:false}),true);
  assert.equal(c.snapshot.phase,'power-on');assert.deepEqual(events(c),['power-on','bios']);
  for(const [dt,phase] of [[1.2,'zoom-in'],[2.4,'loading'],[6,'welcome'],[1.4,'desktop']]){c.tick(dt);assert.equal(c.snapshot.phase,phase);}
  assert.deepEqual(events(c),['startup','desktop-ready']);c.tick(20);assert.deepEqual(events(c),[]);
  assert.equal(c.snapshot.locked,false);assert.equal(c.snapshot.overlay,1);
});
test('warm entry only zooms and preserves already running power',()=>{
  const c=controller();c.enter({alreadyOn:true});assert.equal(c.snapshot.phase,'zoom-in');
  c.tick(2.4);assert.equal(c.snapshot.phase,'desktop');assert.deepEqual(events(c),['desktop-ready']);
});
test('leave keeps power while accepted shutdown turns off before its animation',()=>{
  const c=controller();c.enter({alreadyOn:true});c.tick(2.4);events(c);
  assert.equal(c.leave(),true);c.tick(2.4);assert.equal(c.snapshot.phase,'room');assert.deepEqual(events(c),['room-ready']);
  c.enter({alreadyOn:true});c.tick(2.4);events(c);
  assert.equal(c.shutdown(),true);assert.deepEqual(events(c),['power-off','shutdown']);
  for(const [dt,phase]of [[2.5,'fade-out'],[.5,'zoom-out'],[2.4,'room']]){c.tick(dt);assert.equal(c.snapshot.phase,phase);}
  assert.deepEqual(events(c),['room-ready']);assert.equal(c.snapshot.zoom,0);
});
test('competing commands cannot interrupt transitions or start from the wrong phase',()=>{
  const c=controller();assert.equal(c.leave(),false);assert.equal(c.shutdown(),false);
  c.enter({alreadyOn:false});const before=c.snapshot;
  assert.equal(c.enter({alreadyOn:true}),false);assert.equal(c.leave(),false);assert.equal(c.shutdown(),false);
  assert.deepEqual(c.snapshot,before);c.tick(11);assert.equal(c.enter({alreadyOn:false}),false);
});
test('invalid deltas do nothing and overshoot emits each boundary exactly once',()=>{
  const c=controller();c.enter({alreadyOn:false});const before=c.snapshot;
  for(const dt of [-1,NaN,Infinity,0,undefined])c.tick(dt);assert.deepEqual(c.snapshot,before);
  c.tick(100);assert.equal(c.snapshot.phase,'desktop');assert.deepEqual(events(c),['power-on','bios','startup','desktop-ready']);
  c.shutdown();c.tick(100);assert.equal(c.snapshot.phase,'room');assert.deepEqual(events(c),['power-off','shutdown','room-ready']);
});
test('cancel clears pending events and later frames cannot resurrect a cancelled boot',()=>{
  const c=controller();c.enter({alreadyOn:false});c.tick(2);c.cancel();
  c.tick(100);assert.equal(c.snapshot.phase,'room');assert.equal(c.snapshot.locked,false);assert.deepEqual(events(c),[]);
  const snapshot=c.snapshot;snapshot.phase='desktop';snapshot.zoom=1;assert.equal(c.snapshot.phase,'room');assert.equal(c.snapshot.zoom,0);
  assert.equal(c.enter({alreadyOn:true}),true);
});
test('zoom and overlay remain continuous monotonic and blend only near the screen',()=>{
  const c=controller();c.enter({alreadyOn:true});let previous=0;
  for(let i=0;i<240;i++){c.tick(.01);assert.ok(c.snapshot.zoom>=previous);previous=c.snapshot.zoom;if(i<223)assert.equal(c.snapshot.overlay,0);}
  assert.equal(c.snapshot.phase,'desktop');assert.equal(c.snapshot.zoom,1);
  c.leave();for(let i=0;i<240;i++){c.tick(.01);assert.ok(c.snapshot.zoom<=previous);previous=c.snapshot.zoom;if(i>15)assert.equal(c.snapshot.overlay,0);}
  assert.equal(c.snapshot.phase,'room');assert.equal(previous,0);
});
