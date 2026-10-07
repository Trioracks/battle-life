import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,MeshStandardMaterial} from '../vendor/three/three.module.js';
import {normalizeAppearance,applyAppearance,createProfile,saveProfile,loadProfile} from '../src/avatar-v3-profile.js';
import {readGlb} from './helpers/glb-pose.js';
test('new wardrobe choices and independent colors survive normalization; old shaggy retains bowl silhouette',()=>{
  for(const [key,ids] of Object.entries({hair:['bald','lake','buzz','crop','parted','bowl','messy','longshag'],beard:['none','stubble','short','full','goatee','chinstrap'],mustache:['none','pencil','classic','walrus','handlebar','horseshoe'],top:['tee','shirt','hoodie','sweater','tank','turtleneck'],bottom:['jeans','skinny','breeches','shorts','sports'],footwear:['sneakers','canvas','boots','sandals','flipflops']}))for(const id of ids)assert.equal(normalizeAppearance({[key]:id})[key],id);
  assert.equal(normalizeAppearance({hair:'shaggy'}).hair,'bowl');
  assert.deepEqual(['topColor','bottomColor','footwearColor'].map(k=>normalizeAppearance({[k]:'red'})[k]),['red','red','red']);
});
test('tint changes actual cloth material and leaves fixed soles untouched',()=>{
  const root=new Group(),cloth=new MeshStandardMaterial(),sole=new MeshStandardMaterial({color:0x222222});cloth.userData.tintChannel='top';
  const mesh=new Mesh(undefined,[cloth,sole]);mesh.name='look-top-tee';root.add(mesh);
  applyAppearance(root,{topColor:'red'});assert.equal(cloth.color.getHex(),0xb73535);assert.equal(sole.color.getHex(),0x222222);
  applyAppearance(root,{topColor:'blue'});assert.equal(cloth.color.getHex(),0x3159a6);
});
test('exported wardrobe has all physical variants and different visible lower jaws',()=>{
  const {json:g,values}=readGlb('mannequin.glb');
  for(const name of ['look-hair-lake','look-hair-buzz','look-hair-bowl','look-hair-messy','look-hair-longshag','look-beard-goatee','look-beard-chinstrap','look-mustache-horseshoe','look-top-tank','look-top-turtleneck','look-bottom-skinny','look-footwear-canvas'])assert.ok(g.nodes.some(n=>n.name===name),name);
  const jaw=kind=>g.meshes[g.nodes.find(n=>n.name==='look-face-'+kind).mesh].primitives.flatMap(p=>values(p.attributes.POSITION)).filter(p=>p[1]<1.64&&p[1]>1.49);
  assert.notDeepEqual(jaw('oval'),jaw('square'));assert.notDeepEqual(jaw('oval'),jaw('long'));
  assert.ok(g.materials.some(m=>m.extras?.tintChannel==='top'));
});
test('all eleven colors round trip through saved profiles without coupling clothing channels',()=>{
  let saved;const storage={getItem:()=>saved??null,setItem:(_key,value)=>{saved=value;}};
  for(const color of ['white','grey','black','red','yellow','green','blue','lightblue','olive','beige','brown']){
    const profile=createProfile({name:'Test',allocations:{intelligence:4,writing:4,musicality:2},appearance:{hair:'longshag',beard:'goatee',mustache:'handlebar',topColor:color,bottomColor:'olive',footwearColor:'beige'}});
    assert.equal(saveProfile(storage,profile).ok,true);const loaded=loadProfile(storage).profile;
    assert.equal(loaded.appearance.topColor,color);assert.equal(loaded.appearance.bottomColor,'olive');assert.equal(loaded.appearance.footwearColor,'beige');assert.equal(loaded.appearance.hair,'longshag');
  }
});
test('real exported trims stay fixed while every clothing variant exposes a tint channel',()=>{
  const {json:g}=readGlb('mannequin.glb');
  for(const n of g.nodes){
    const channel=/^look-(top|bottom|footwear)-/.exec(n.name)?.[1];if(!channel||n.mesh===undefined)continue;
    const materials=g.meshes[n.mesh].primitives.map(p=>g.materials[p.material]);
    assert.ok(materials.some(m=>m.extras?.tintChannel===channel),n.name);
    for(const m of materials.filter(m=>/sole|fixed-white|clothing-trim/.test(m.name)))assert.equal(m.extras?.tintChannel,undefined,m.name);
  }
  for(const face of ['oval','square','long'])for(const style of ['stubble','short','full','goatee','chinstrap'])assert.ok(g.nodes.some(n=>n.name.startsWith('look-beard-'+style)&&n.extras?.faceVariant===face),face+' '+style);
});
