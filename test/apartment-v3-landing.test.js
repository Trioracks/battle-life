import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from '../vendor/three/three.module.js';
async function controls(){let api;try{api=await import('../src/apartment-v3-landing.js');}catch{}assert.equal(typeof api?.createLandingReveal,'function','landing must reveal its actual geometry when the entry opens');return api;}
function landing(){const root=new Group();for(const name of ['landing-front-screen','landing-ceiling','landing-neighbour-door']){const m=new Mesh(new BoxGeometry(),new MeshStandardMaterial({color:0x888888}));m.name=name;root.add(m);}return root;}
test('closed entry conceals the landing, and opening reveals it behind a receding dark cutaway',async()=>{
  const {createLandingReveal}=await controls(),root=landing(),v=createLandingReveal(root),[screen,roof,door]=root.children;
  v.apartment(0);assert.equal(screen.visible,true);assert.equal(screen.material.opacity,1);assert.equal(door.visible,false);assert.ok(roof.material.color.r<.05);
  v.apartment(.5);assert.equal(door.visible,true);assert.equal(screen.material.opacity,.5);assert.equal(screen.material.transparent,true);
  v.apartment(1);assert.equal(screen.visible,false);assert.equal(door.visible,true);assert.equal(roof.visible,true);
});
test('peephole restores actual interior materials without leaving the apartment reveal open afterward',async()=>{
  const {createLandingReveal}=await controls(),root=landing(),v=createLandingReveal(root),[screen,roof,door]=root.children;
  const before=roof.material.color.clone();v.apartment(0);v.peephole();
  assert.equal(door.visible,true);assert.equal(screen.material.opacity,1);assert.equal(roof.material.color.equals(before),true);
  v.apartment(0);assert.equal(door.visible,false);assert.equal(screen.visible,true);
});
