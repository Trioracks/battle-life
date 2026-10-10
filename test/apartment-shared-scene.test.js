import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from '../vendor/three/three.module.js';
import * as camera from '../src/apartment-v3-camera.js';

function room(){
 const staticScene=new Group(),liveScene=new Group(),courtyard=new Group();
 const mesh=name=>{const object=new Mesh(new BoxGeometry(),new MeshStandardMaterial());object.name=name;return object;};
 const furniture=mesh('static-aged-wood'),shell=mesh('static-cutaway-shell-wallpaper'),door=mesh('hinge-passage'),blanket=mesh('sleep-blanket'),cover=mesh('bed-cover'),proxy=mesh('depth-bed'),bulb=mesh('lamp-living-bulb');
 staticScene.add(furniture,shell);liveScene.add(door,blanket,cover,proxy,bulb);
 door.rotation.y=.8;blanket.visible=false;bulb.visible=false;
 const target=mesh('bed-target');target.userData.action='bed';target.position.set(1.75,.6,-.8);liveScene.add(target);
 return {staticScene,liveScene,courtyard,furniture,shell,door,blanket,cover,proxy,bulb,target};
}

test('both apartment cameras retain the same furnished geometry, materials and live state',()=>{
 assert.equal(typeof camera.createSharedSceneVisibility,'function','camera modes need one shared furnished scene');
 const r=room(),apply=camera.createSharedSceneVisibility(r),geometry=r.furniture.geometry,material=r.furniture.material;
 for(const mode of ['2D','3D','2D']){
  apply({mode});
  assert.equal(r.staticScene.visible,true,mode+' renders authored furniture');
  assert.equal(r.liveScene.visible,true);assert.equal(r.courtyard.visible,true);
  assert.equal(r.furniture.visible,true);assert.equal(r.furniture.geometry,geometry);assert.equal(r.furniture.material,material);
  assert.equal(r.shell.visible,mode==='3D','only front wall and ceiling use cutaway');
  assert.equal(r.proxy.visible,false,'old photograph depth proxies cannot mask actual furniture');
  assert.equal(r.bulb.visible,true,'same real lamp surface in both cameras');
  assert.equal(r.door.rotation.y,.8);assert.equal(r.blanket.visible,false);assert.equal(r.cover.visible,true);
  assert.deepEqual(r.target.position.toArray(),[1.75,.6,-.8]);assert.equal(r.target.userData.action,'bed');
 }
 r.blanket.visible=true;r.cover.visible=false;r.door.rotation.y=1.5;
 apply({mode:'3D'});apply({mode:'2D'});
 assert.equal(r.blanket.visible,true);assert.equal(r.cover.visible,false);assert.equal(r.door.rotation.y,1.5);
});

test('monitor camera uses the same furniture cutaway and restores full first person shell',()=>{
 assert.equal(typeof camera.createSharedSceneVisibility,'function');
 const r=room(),apply=camera.createSharedSceneVisibility(r);
 apply({mode:'3D',computerActive:true});assert.equal(r.shell.visible,false);assert.equal(r.furniture.visible,true);
 r.staticScene.visible=false;r.liveScene.visible=false;r.courtyard.visible=false;
 apply({mode:'3D'});
 assert.equal(r.shell.visible,true);assert.equal(r.staticScene.visible,true);assert.equal(r.liveScene.visible,true);assert.equal(r.courtyard.visible,true);
});
