import test from 'node:test';
import assert from 'node:assert/strict';
const creator=await import('../src/apartment-v3-creator.js').catch(()=>({}));

test('category selection frames the corresponding body zone and full body is recoverable',()=>{
  assert.equal(typeof creator.CreatorSelection,'function','creator selection controller must exist');
  const ui=new creator.CreatorSelection();
  ui.category('mustache');assert.equal(ui.zone,'head');
  ui.category('footwear');assert.equal(ui.zone,'footwear');
  ui.frame('body');assert.equal(ui.zone,'body');
  ui.frame('unknown');assert.equal(ui.zone,'body');
});
test('independent swatches survive category changes and provide labeled pressed controls',()=>{
  assert.equal(typeof creator.CreatorSelection,'function');
  const ui=new creator.CreatorSelection();
  ui.category('top');ui.select('top','hoodie');ui.select('topColor','red');
  ui.category('bottom');ui.select('bottomColor','yellow');ui.category('top');
  assert.equal(ui.appearance.topColor,'red');assert.equal(ui.appearance.bottomColor,'yellow');
  assert.equal(ui.options().find(x=>x.id==='hoodie').pressed,true);
  assert.deepEqual(ui.swatches().find(x=>x.id==='red'),{id:'red',label:'Красный',pressed:true,color:'#b73535'});
  ui.select('top','invalid');assert.equal(ui.appearance.top,'hoodie');
  ui.reset();assert.equal(ui.appearance.top,'tee');assert.equal(ui.appearance.topColor,'white');
});
test('zoom clamps to a usable framing range',()=>{
  assert.equal(typeof creator.CreatorSelection,'function');
  const ui=new creator.CreatorSelection();
  ui.setZoom(999);assert.equal(ui.zoom,1.5);
  ui.setZoom(-10);assert.equal(ui.zoom,.8);
});
