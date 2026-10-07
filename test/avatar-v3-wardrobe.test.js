import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,MeshStandardMaterial,Ray,Vector3,Triangle} from '../vendor/three/three.module.js';
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
test('buzz is a light skin-adjacent shaved surface, visibly distinct from solid crop',()=>{
  const {json:g}=readGlb('mannequin.glb');
  const luminance=id=>{const n=g.nodes.find(n=>n.name==='look-hair-'+id);return Math.max(...g.meshes[n.mesh].primitives.map(p=>{const c=g.materials[p.material].pbrMetallicRoughness.baseColorFactor;return c[0]*.2126+c[1]*.7152+c[2]*.0722;}));};
  assert.ok(luminance('buzz')>luminance('crop')*2.5,'shaved scalp cannot use the dark crop cap material');
});
test('layered hairstyles use sparse tapered planes and messy fringe leaves an asymmetric forehead opening',()=>{
  const {json:g,values}=readGlb('mannequin.glb');
  for(const kind of ['parted','messy','longshag']){
    const n=g.nodes.find(n=>n.name==='look-hair-'+kind),primitives=g.meshes[n.mesh].primitives;
    assert.ok(primitives.reduce((sum,p)=>sum+g.accessors[p.attributes.POSITION].count,0)<1800,kind+' should have broad angular locks rather than dense round capsules');
    if(kind==='messy'){
      const all=primitives.flatMap(p=>values(p.attributes.POSITION));
      assert.ok(all.some(v=>v[0]>-.10&&v[0]<0&&v[1]<1.735&&v[2]>.12),'one diagonal fringe must reach the left brow');
      assert.ok(all.some(v=>v[1]<1.55&&v[2]<-.07),'irregular nape tufts must be longer than crop');
      const ray=new Ray(new Vector3(.045,1.744,.08),new Vector3(0,0,1));
      for(const p of primitives){const vv=values(p.attributes.POSITION),ii=values(p.indices).flat();for(let i=0;i<ii.length;i+=3)assert.equal(ray.intersectTriangle(...ii.slice(i,i+3).map(j=>new Vector3().fromArray(vv[j])),false,new Vector3()),null,'right eye/forehead must remain open');}
    }
  }
});
test('each face-specific shaved shell stays within 4 mm of its own actual scalp triangles without a raised roof',()=>{
  const {json:g,values}=readGlb('mannequin.glb');
  for(const face of ['oval','square','long']){
    const head=g.nodes.find(n=>n.name==='look-face-'+face),triangles=[];let headTop=0;
    for(const p of g.meshes[head.mesh].primitives.filter(p=>g.materials[p.material].name==='warm-skin')){
      const vv=values(p.attributes.POSITION),ii=values(p.indices).flat();headTop=Math.max(headTop,...vv.map(v=>v[1]));
      for(let i=0;i<ii.length;i+=3)triangles.push(new Triangle(...ii.slice(i,i+3).map(j=>new Vector3().fromArray(vv[j]))));
    }
    for(const kind of ['buzz','lake']){
      const n=g.nodes.find(n=>n.name.startsWith('look-hair-'+kind)&&n.extras?.faceVariant===face)??g.nodes.find(n=>n.name==='look-hair-'+kind);
      const vv=g.meshes[n.mesh].primitives.filter(p=>g.materials[p.material].name===(kind==='buzz'?'shaved-scalp-skin-mix':'hair-dark-brown')).flatMap(p=>values(p.attributes.POSITION));
      assert.ok(vv.length>16);
      for(const v of vv){const point=new Vector3().fromArray(v),closest=new Vector3();const distance=Math.min(...triangles.map(t=>t.closestPointToPoint(point,closest).distanceTo(point)));assert.ok(distance<=.0041,`${face}/${kind}: scalp clearance ${distance} exceeds 4 mm`);}
      assert.ok(Math.max(...vv.map(v=>v[1]))<=headTop+.0031,face+' shell cannot rise above a 3 mm crown offset');
      if(kind==='buzz')assert.ok(Math.max(...vv.map(v=>v[1]))>headTop+.002,face+' crown must sit outside the skin');
      assert.equal(n.extras?.faceVariant,face);
    }
  }
});
