import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
const retro=await import('../src/apartment-v3-retro.js').catch(()=>({}));

test('render sizing downsamples desktop and narrow canvases without device pixel ratio inflation',()=>{
  assert.equal(typeof retro.renderSize,'function','shared render sizing must exist');
  assert.deepEqual(retro.renderSize(1280,720),{width:640,height:360,scale:2});
  assert.deepEqual(retro.renderSize(390,844),{width:195,height:422,scale:2});
  assert.deepEqual(retro.renderSize(2560,1440),{width:640,height:360,scale:4});
});
test('preview viewport maps CSS coordinates into the same low resolution target after resize',()=>{
  assert.equal(typeof retro.renderViewport,'function');
  assert.deepEqual(retro.renderViewport({left:10,bottom:730,width:1280,height:720},{left:110,bottom:630,width:400,height:500}),{x:50,y:50,width:200,height:250});
});
test('reduced motion holds grain stable while normal grain changes slowly',()=>{
  assert.equal(typeof retro.grainFrame,'function');
  assert.equal(retro.grainFrame(1500,true),retro.grainFrame(9800,true));
  assert.equal(retro.grainFrame(1000,false),retro.grainFrame(1050,false));
  assert.notEqual(retro.grainFrame(1000,false),retro.grainFrame(1500,false));
});

test('preview region survives the render target rebind performed by shadow rendering',()=>{
  let target=null,reboundViewport;
  // The shadow pass restores the target's stored viewport, not renderer.setViewport.
  const renderer={setPixelRatio(){},setSize(){},setRenderTarget(value){target=value;},setScissorTest(){},setViewport(){},setScissor(){},clear(){},
    render(){if(target)reboundViewport=target.viewport.toArray();}};
  const canvas={dataset:{},getBoundingClientRect:()=>({left:0,bottom:720,width:1280,height:720})};
  const pass=retro.createRetroPass(THREE,renderer,canvas);pass.resize(1280,720);
  pass.render(new THREE.Scene(),new THREE.Camera(),{left:42,bottom:590,width:512,height:450});
  assert.deepEqual(reboundViewport,[21,65,256,225]);
  pass.render(new THREE.Scene(),new THREE.Camera());
  assert.deepEqual(reboundViewport,[0,0,640,360]);
  pass.dispose();
});
