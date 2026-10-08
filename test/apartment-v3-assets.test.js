import {assetPath} from './helpers/apartment-assets.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function glb(name){
  const b=fs.readFileSync(assetPath(name));
  assert.equal(b.readUInt32LE(0),0x46546c67);
  const n=b.readUInt32LE(12),json=JSON.parse(b.subarray(20,20+n).toString());
  const bin=b.subarray(28+n);
  function values(i){const a=json.accessors[i],v=json.bufferViews[a.bufferView];assert.equal(a.componentType,5126);
    const size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],stride=v.byteStride??size*4,out=[];
    for(let k=0;k<a.count;k++)for(let c=0;c<size;c++)out.push(bin.readFloatLE((v.byteOffset??0)+(a.byteOffset??0)+k*stride+c*4));
    return {values:out,size};}
  return {json,values};
}

test('new hero is genuinely skinned and exposes wardrobe attachment bones',()=>{
  const {json:g}=glb('mannequin.glb');
  assert.ok(g.skins?.[0].joints.length>=19);
  const joints=new Set(g.skins[0].joints.map(i=>g.nodes[i].name));
  for(const name of ['pelvis','chest','head','upper_arm.L','forearm.L','upper_arm.R','forearm.R','thigh.L','shin.L','thigh.R','shin.R','foot.L','foot.R'])assert.ok(joints.has(name),name);
  assert.ok(g.nodes.some(n=>n.name==='socket-hair'));
  assert.ok(g.nodes.some(n=>n.mesh!==undefined&&n.skin!==undefined));
  assert.equal(g.images?.length??0,0,'hero must be geometry, not a pasted image');
});

test('walk is cyclic, bends both knees, and keys the full body',()=>{
  const {json:g,values}=glb('mannequin.glb');
  const walk=g.animations.find(a=>a.name==='walk');assert.ok(walk);
  const animated=new Set();
  for(const c of walk.channels){
    animated.add(g.nodes[c.target.node].name);
    const {values:v,size}=values(walk.samplers[c.sampler].output);
    for(let i=0;i<size;i++)assert.ok(Math.abs(v[i]-v[v.length-size+i])<.0001,'loop seam '+g.nodes[c.target.node].name);
    if(c.target.path==='rotation'&&['shin.L','shin.R'].includes(g.nodes[c.target.node].name)){
      const variation=Array.from({length:size},(_,i)=>{const a=v.filter((_,k)=>k%size===i);return Math.max(...a)-Math.min(...a);});
      assert.ok(Math.max(...variation)>.15,'knee must change between frames, not merely have a nonidentity quaternion');
    }
  }
  for(const name of ['pelvis','head','shin.L','shin.R','upper_arm.L','upper_arm.R'])assert.ok(animated.has(name),name);
  for(const name of ['idle','seated','sleep','wash','reach','open-door'])assert.ok(g.animations.some(a=>a.name===name),name);
});

test('walk samples keep stance feet planted and swing arms forward/back, not sideways',()=>{
  const samples=JSON.parse(fs.readFileSync(assetPath('walk-audit.json'),'utf8'));
  const spread=a=>Math.max(...a)-Math.min(...a);
  const stance=samples.slice(0,19);
  const rig=JSON.parse(fs.readFileSync(assetPath('rig.json'),'utf8'));
  assert.ok(spread(stance.map((s,i)=>s['foot.L'].head[1]-rig.walk.strideDistance*i/30))<.005,'no foot sliding during stance');
  const soleHeights=stance.map(s=>{
    const a=s['foot.L'].head,b=s['toe.L'].head,pitch=Math.atan2(-(b[2]-a[2]),-(b[1]-a[1]))-Math.atan2(.04,.145);
    return Math.min(...rig.walk.soleProfile.map(([y,z])=>a[2]+y*Math.sin(pitch)+(z-.095)*Math.cos(pitch)));
  });
  assert.ok(Math.min(...soleHeights)>-.008&&Math.max(...soleHeights)<.012,'shoe sole stays on the floor through heel-toe roll');
  for(const side of ['L','R']){
    const relative=samples.map(s=>s['hand.'+side].head.map((v,i)=>v-s['upper_arm.'+side].head[i]));
    assert.ok(spread(relative.map(v=>v[1]))>.18,'arms swing forward and back relative to the shoulder');
    assert.ok(spread(relative.map(v=>v[0]))<.012,'body sway moves shoulder and hand together rather than swinging arms sideways');
    for(const s of samples)assert.ok(Math.hypot(...s['thigh.'+side].tail.map((v,i)=>v-s['shin.'+side].head[i]))<.005);
  }
});

test('exported apartment contains actual hinged doors and body occluders',()=>{
  const {json:g}=glb('interaction.glb'),names=new Set(g.nodes.map(n=>n.name));
  for(const name of ['hinge-passage','hinge-entry','hinge-fridge'])assert.ok(names.has(name),name);
  assert.ok([...names].filter(n=>n.startsWith('depth-')).length>=6);
  const scene=JSON.parse(fs.readFileSync(assetPath('scene.json'),'utf8'));
  for(const a of Object.values(scene.actions))if(a.pose){assert.ok(Math.abs(a.pose[0]-a.approach[0])<.2);assert.ok(a.pose[0]>=scene.bounds[0]&&a.pose[0]<=scene.bounds[1]);}
});

test('moving doors retain baked surface textures and a raised sleeping blanket covers the body',()=>{
  const {json:g}=glb('interaction.glb');
  for(const prefix of ['passage-leaf','entry-leaf','fridge-leaf']){
    const node=g.nodes.find(n=>n.name===prefix);assert.ok(node,prefix);
    const materials=g.meshes[node.mesh].primitives.map(p=>g.materials[p.material]);
    assert.ok(materials.every(m=>m.pbrMetallicRoughness?.baseColorTexture),'export must not flatten '+prefix);
  }
  const blanket=g.nodes.find(n=>n.name==='sleep-blanket');assert.ok(blanket);
  const primitive=g.meshes[blanket.mesh].primitives[0];
  const positions=g.accessors[primitive.attributes.POSITION];
  assert.ok(positions.max[1]>.95,'blanket must rise above the sleeping torso, not lie flat below it');
  assert.ok(positions.min[0]<1.45&&positions.max[0]>2.7,'blanket must cover shoulders through feet');
});

test('the occupied and empty bed use the same woven cover and UV layout',()=>{
  const {json:g,values}=glb('interaction.glb');
  const rest=g.nodes.find(n=>n.name==='bed-cover');
  const sleep=g.nodes.find(n=>n.name==='sleep-blanket');
  assert.ok(rest,'empty-bed cover must be runtime cloth, not a different baked rectangle');
  assert.ok(sleep);
  const a=g.meshes[rest.mesh].primitives[0],b=g.meshes[sleep.mesh].primitives[0];
  assert.equal(a.material,b.material,'both poses must share the same woven material');
  const texture=g.materials[a.material].pbrMetallicRoughness.baseColorTexture;
  assert.ok(texture,'woven cover retains its baked stripe texture');
  const av=g.accessors[a.attributes.TEXCOORD_0],bv=g.accessors[b.attributes.TEXCOORD_0];
  assert.equal(av.count,bv.count,'same topology preserves stripe placement when the body enters');
  assert.deepEqual(values(a.attributes.TEXCOORD_0).values,values(b.attributes.TEXCOORD_0).values);
});

test('side exit opens into an actual landing and clock hands can show game time',()=>{
  const {json:g}=glb('interaction.glb');
  const entry=g.nodes.find(n=>n.name==='hinge-entry');
  assert.ok(entry.translation[0]>6.3,'entry hinge belongs to the right side wall');
  const scene=JSON.parse(fs.readFileSync(assetPath('scene.json'),'utf8'));
  assert.ok(scene.entryExit.position[0]>7.5,'exit continues outward through the side wall');
  assert.ok(Math.abs(scene.actions.entry.yaw-Math.PI/2)<.001);
  const landing=g.nodes.find(n=>n.name==='landing-root');
  assert.ok(landing,'peephole has real landing geometry to render');
  const ceiling=g.nodes.findIndex(n=>n.name==='landing-ceiling');
  assert.ok(ceiling>=0&&landing.children.includes(ceiling),'peephole landing has a ceiling instead of showing blue sky above the wall');
  for(const name of ['clock-hour-hand','clock-minute-hand']){
    const node=g.nodes.find(n=>n.name===name);assert.ok(node,name);
    assert.ok(node.mesh!==undefined,'clock hand is independently rotatable geometry');
  }
});

test('occupied cover has softly rounded body volumes rather than a tall square board',()=>{
  const {json:g,values}=glb('interaction.glb');
  const node=g.nodes.find(n=>n.name==='sleep-blanket');
  const p=g.meshes[node.mesh].primitives[0];const v=values(p.attributes.POSITION).values;
  const sample=(lo,hi)=>{const a=[];for(let i=0;i<v.length;i+=3)if(v[i]>1.85&&v[i]<2.05&&v[i+2]>lo&&v[i+2]<hi)a.push(v[i+1]);return Math.max(...a);};
  const center=sample(-.92,-.78),front=sample(-.68,-.60),rear=sample(-1.14,-1.06);
  assert.ok(center-(front+rear)/2>.05,'cloth curves around the body instead of making a broad flat board');
  const top=[];for(let i=0;i<v.length;i+=3)if(v[i+2]<-.66&&v[i+2]>-.95)top.push(v[i+1]);
  assert.ok(Math.max(...top)-Math.min(...top)>.13,'shoulders, waist and bent knees create a varied profile');
});
