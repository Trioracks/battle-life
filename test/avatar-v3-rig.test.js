import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Object3D,AnimationMixer,AnimationClip,VectorKeyframeTrack,QuaternionKeyframeTrack,Vector3,Matrix4,Ray} from '../vendor/three/three.module.js';

function model() {
  const b=fs.readFileSync(new URL('../assets/apartment/v3/mannequin.glb',import.meta.url));
  const jsonLength=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+jsonLength).toString());
  const bin=b.subarray(28+jsonLength);
  const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
  function values(index){
    const a=g.accessors[index],v=g.bufferViews[a.bufferView],width=widths[a.type];
    const bytes={5121:1,5123:2,5126:4}[a.componentType],read={5121:'readUInt8',5123:'readUInt16LE',5126:'readFloatLE'}[a.componentType];
    return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,k)=>bin[read]((v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??width*bytes)+k*bytes)));
  }
  return {g,values};
}

// Evaluate the exported GLB's real hierarchy and animation with the game mixer.
function animatedModel(clip) {
  const {g,values}=model(),root=new Object3D();
  const nodes=g.nodes.map(n=>{
    const o=new Object3D();o.name=n.name;
    if(n.translation)o.position.fromArray(n.translation);
    if(n.rotation)o.quaternion.fromArray(n.rotation);
    if(n.scale)o.scale.fromArray(n.scale);
    return o;
  });
  g.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));
  g.scenes[g.scene??0].nodes.forEach(i=>root.add(nodes[i]));root.updateMatrixWorld(true);
  const animation=g.animations.find(a=>a.name===clip);
  const tracks=animation.channels.map(c=>{
    const sampler=animation.samplers[c.sampler],property={translation:'position',rotation:'quaternion',scale:'scale'}[c.target.path];
    const Track=c.target.path==='rotation'?QuaternionKeyframeTrack:VectorKeyframeTrack;
    return new Track(`${nodes[c.target.node].uuid}.${property}`,values(sampler.input).flat(),values(sampler.output).flat());
  });
  const mixer=new AnimationMixer(root);mixer.clipAction(new AnimationClip(clip,-1,tracks)).play();
  const joint=name=>nodes.find(n=>n.name===name);
  const position=name=>joint(name).getWorldPosition(new Vector3());
  function frame(t){mixer.setTime(t);root.updateMatrixWorld(true);}
  function vertices(name){
    const i=g.nodes.findIndex(n=>n.name===name),n=g.nodes[i],skin=g.skins[n.skin],inverse=values(skin.inverseBindMatrices).map(v=>new Matrix4().fromArray(v));
    return g.meshes[n.mesh].primitives.flatMap(p=>{
      const positions=values(p.attributes.POSITION),weights=values(p.attributes.WEIGHTS_0),joints=values(p.attributes.JOINTS_0);
      return positions.map((v,k)=>{
        const result=new Vector3();
        for(let j=0;j<4;j++)if(weights[k][j])result.addScaledVector(new Vector3().fromArray(v).applyMatrix4(new Matrix4().multiplyMatrices(nodes[skin.joints[joints[k][j]]].matrixWorld,inverse[joints[k][j]])),weights[k][j]);
        return result;
      });
    });
  }
  return {g,root,joint,position,frame,vertices};
}

function kneeAngle(a,b,c){return a.clone().sub(b).negate().angleTo(c.clone().sub(b))*180/Math.PI;}

// Detached sleeve cylinders and an hourglass waist fail on the exported fabric.
test('tee is a continuous loose garment from hem through both sleeve openings',()=>{
  const {g,values}=model(),node=g.nodes.find(n=>n.name==='look-top-tee');
  const graph=new Map(),positions=[];
  const key=v=>v.map(x=>Math.round(x*100000)).join(',');
  for(const p of g.meshes[node.mesh].primitives){
    const vertices=values(p.attributes.POSITION),indices=values(p.indices).flat();positions.push(...vertices);
    for(let i=0;i<indices.length;i+=3){
      const tri=indices.slice(i,i+3).map(j=>key(vertices[j]));
      for(const a of tri){if(!graph.has(a))graph.set(a,new Set());for(const b of tri)graph.get(a).add(b);}
    }
  }
  const unseen=new Set(graph.keys());let components=0;
  while(unseen.size){components++;const queue=[unseen.values().next().value];unseen.delete(queue[0]);while(queue.length)for(const n of graph.get(queue.pop()))if(unseen.delete(n))queue.push(n);}
  assert.equal(components,1,'shirt fabric must share vertices with armholes and sleeves');
  const widthAt=(lo,hi)=>Math.max(...positions.filter(v=>v[1]>lo&&v[1]<hi&&Math.abs(v[0])<.22).map(v=>Math.abs(v[0])));
  assert.ok(widthAt(1.02,1.10)/widthAt(1.30,1.38)>.85,'fabric must hang straight rather than pinch at the waist');
});

// A forgotten stale thigh variable makes both back pockets follow one leg.
test('jeans pockets are flat sewn panels and each follows its own hip',()=>{
  const {g,values}=model(),node=g.nodes.find(n=>n.name==='look-bottom-jeans');
  const jointNames=g.skins[node.skin].joints.map(i=>g.nodes[i].name);
  const panels=g.meshes[node.mesh].primitives.filter(p=>g.materials[p.material].name==='denim-pocket');
  assert.ok(panels.length,'back pockets need an independently inspectable sewn material');
  let left=0,right=0;
  for(const p of panels){
    const pos=values(p.attributes.POSITION),weights=values(p.attributes.WEIGHTS_0),joints=values(p.attributes.JOINTS_0);
    for(let i=0;i<pos.length;i++){
      const side=pos[i][0]>0?'L':'R';if(side==='L')left++;else right++;
      const wrong=weights[i].reduce((sum,w,k)=>sum+(jointNames[joints[i][k]]===`thigh.${side==='L'?'R':'L'}`?w:0),0);
      assert.ok(wrong<.001,'pocket cannot deform with the opposite thigh');
    }
    const depths=pos.map(v=>v[2]);assert.ok(Math.max(...depths)-Math.min(...depths)<.016,'back pockets must not be oval padded volumes');
  }
  assert.ok(left>3&&right>3);
});

// Pure vertical root motion produces the old bouncing, rigid-hip walk.
test('walk transfers weight laterally and rotates hips against shoulders',()=>{
  const avatar=animatedModel('walk'),pelvis=[],hipRoll=[],hipTurn=[],shoulderTurn=[];
  for(let i=0;i<30;i++){
    avatar.frame(i/30);pelvis.push(avatar.position('pelvis').x);
    const hips=avatar.position('thigh.L').sub(avatar.position('thigh.R'));
    const shoulders=avatar.position('upper_arm.L').sub(avatar.position('upper_arm.R'));
    hipRoll.push(hips.y);hipTurn.push(hips.z);shoulderTurn.push(shoulders.z);
  }
  const span=a=>Math.max(...a)-Math.min(...a);
  assert.ok(span(pelvis)>.024,'weight must travel over the supporting leg');
  assert.ok(span(hipRoll)>.012,'pelvis needs a gentle frontal roll');
  assert.ok(span(hipTurn)>.025,'hips rotate with the advancing leg');
  assert.ok(hipTurn.reduce((s,v,i)=>s+v*shoulderTurn[i],0)<-.002,'shoulders counter-rotate to balance the hips');
});

test('stylized head reads at game scale and shorts hang clear of bare thighs',()=>{
  const {g,values}=model();
  const points=name=>g.meshes[g.nodes.find(n=>n.name===name).mesh].primitives.flatMap(p=>values(p.attributes.POSITION));
  const head=points('look-face-oval'),shorts=points('look-bottom-shorts');
  assert.ok(Math.max(...head.map(v=>v[1]))-Math.min(...head.map(v=>v[1]))>.31,'head silhouette needs readable stylized proportions');
  const hem=shorts.filter(v=>v[1]>.60&&v[1]<.66&&v[0]>.112);
  assert.ok(Math.max(...hem.map(v=>v[0]))>.195,'shorts need fabric clearance around the .174 m bare thigh edge');
});

test('stubble conforms to the lower face rather than adding capsule lobes',()=>{
  const {g,values}=model(),face=g.nodes.find(n=>n.name==='look-face-oval'),beard=g.nodes.find(n=>n.name==='look-beard-stubble');
  const skin=g.meshes[face.mesh].primitives.flatMap(p=>values(p.attributes.POSITION));
  const vertices=g.meshes[beard.mesh].primitives.flatMap(p=>values(p.attributes.POSITION));
  for(const v of vertices){
    const distance=Math.min(...skin.map(p=>Math.hypot(...p.map((x,i)=>x-v[i]))));
    assert.ok(distance<.012,`stubble vertex ${v} is detached from the facial surface by ${distance}`);
  }
});

test('stubble reads as a skin-adjacent shade and is visibly lighter than a full beard',()=>{
  const {g}=model();
  const color=name=>g.materials.find(m=>m.name===name).pbrMetallicRoughness.baseColorFactor.slice(0,3);
  const skin=color('warm-skin'),short=color('short-beard'),full=color('hair-dark-brown');
  const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
  const luminance=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
  assert.ok(distance(short,skin)<distance(short,full),'stubble must remain closer to skin than to the solid full-beard color');
  assert.ok(luminance(short)>luminance(full)*3,'stubble must be visibly lighter than full facial hair');
  assert.ok(luminance(short)<luminance(skin),'stubble still needs a visible darker shade on the jaw');
});

test('full beard leaves the lips and upper cheeks open instead of forming a face mask',()=>{
  const {g,values}=model(),node=g.nodes.find(n=>n.name==='look-beard-full'),triangles=[];
  for(const p of g.meshes[node.mesh].primitives){
    const positions=values(p.attributes.POSITION),indices=values(p.indices).flat();
    for(let i=0;i<indices.length;i+=3)triangles.push(indices.slice(i,i+3).map(j=>new Vector3().fromArray(positions[j])));
  }
  for(const [x,y] of [[-.065,1.63],[.065,1.63],[-.025,1.601],[0,1.604],[.025,1.601]]){
    const ray=new Ray(new Vector3(x,y,.075),new Vector3(0,0,1));
    assert.ok(!triangles.some(t=>ray.intersectTriangle(...t,false,new Vector3())),`beard covers exposed cheek/lip point ${x},${y}`);
  }
});

test('full beard has warm readable planes and remains distinct from soft stubble',()=>{
  const {g}=model(),node=g.nodes.find(n=>n.name==='look-beard-full');
  const colors=g.meshes[node.mesh].primitives.map(p=>g.materials[p.material].pbrMetallicRoughness.baseColorFactor);
  const light=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
  const hair=light(g.materials.find(m=>m.name==='hair-dark-brown').pbrMetallicRoughness.baseColorFactor);
  const stubble=light(g.materials.find(m=>m.name==='short-beard').pbrMetallicRoughness.baseColorFactor);
  assert.ok(colors.every(c=>light(c)>hair*1.6),'full beard must not reuse the near-black scalp material');
  assert.ok(Math.max(...colors.map(light))/Math.min(...colors.map(light))>1.2,'cheek boundary and short beard volume need readable tonal variation');
  assert.ok(colors.every(c=>light(c)<stubble*.85),'full beard should remain darker than the preserved stubble');
});

test('switch tap touches the rocker with the actual right hand then withdraws without entering the wall',()=>{
  const {g,values}=model();assert.ok(g.animations.some(a=>a.name==='switch'),'export a separate switch gesture');
  const avatar=animatedModel('switch'),body=g.nodes.find(n=>n.name==='neutral-skinned-body');
  const names=g.skins[body.skin].joints.map(i=>g.nodes[i].name),hand=[];let offset=0;
  for(const p of g.meshes[body.mesh].primitives){
    const weights=values(p.attributes.WEIGHTS_0),joints=values(p.attributes.JOINTS_0);
    weights.forEach((w,i)=>{if(w.some((v,k)=>v>.9&&names[joints[i][k]]==='hand.R'))hand.push(offset+i);});offset+=weights.length;
  }
  assert.ok(hand.length>20,'check the real hand surface');
  avatar.root.rotation.y=Math.PI;avatar.root.position.z=-1.10;
  const rocker=new Vector3(.25,1.22,-1.576),distance=[];
  for(const t of [0,.32,.69]){
    avatar.frame(t);const surface=avatar.vertices('neutral-skinned-body');
    const points=hand.map(i=>surface[i]);distance.push(Math.min(...points.map(p=>p.distanceTo(rocker))));
    assert.ok(Math.min(...points.map(p=>p.z))>-1.586,'finger surface must not enter the wall behind the rocker');
  }
  assert.ok(distance[1]<.006,`right hand misses the rocker at contact time: ${distance[1]}`);
  assert.ok(distance[0]>.18&&distance[2]>.18,'hand starts relaxed and withdraws after the tap');
  const animation=g.animations.find(a=>a.name==='switch');
  assert.ok(Math.abs(Math.max(...animation.samplers.flatMap(s=>values(s.input).flat()))-.7)<.001,'tap clip lasts .7 seconds');
});

test('sewn sleeve crowns cover the upper arm skin in the idle pose',()=>{
  const {g,values}=model(),avatar=animatedModel('idle');avatar.frame(0);
  const skin=avatar.vertices('neutral-skinned-body').filter(v=>Math.abs(v.x)>.205&&v.y>1.355&&v.y<1.405);
  assert.ok(skin.length>10);
  for(const look of ['tee','shirt','sweater','hoodie']){
    const name='look-top-'+look,node=g.nodes.find(n=>n.name===name),fabric=avatar.vertices(name),triangles=[];let base=0;
    for(const p of g.meshes[node.mesh].primitives){
      const indices=values(p.indices).flat();for(let i=0;i<indices.length;i+=3)triangles.push(indices.slice(i,i+3).map(j=>fabric[base+j]));
      base+=values(p.attributes.POSITION).length;
    }
    for(const point of skin){
      const ray=new Ray(point,new Vector3(0,1,0));
      assert.ok(triangles.some(t=>ray.intersectTriangle(...t,false,new Vector3())),`${look} exposes upper shoulder at ${point.toArray()}`);
    }
  }
});

test('cropped hair encloses every selectable cranium above its hairline',()=>{
  const {g,values}=model(),avatar=animatedModel('idle');avatar.frame(0);
  const name='look-hair-crop',node=g.nodes.find(n=>n.name===name),hair=avatar.vertices(name),triangles=[];let base=0;
  for(const p of g.meshes[node.mesh].primitives){
    const indices=values(p.indices).flat();for(let i=0;i<indices.length;i+=3)triangles.push(indices.slice(i,i+3).map(j=>hair[base+j]));
    base+=values(p.attributes.POSITION).length;
  }
  for(const face of ['oval','square','long']){
    const crown=avatar.vertices('look-face-'+face).filter(v=>v.y>1.78&&v.y<1.84&&Math.hypot(v.x,v.z-.012)>.04);
    assert.ok(crown.length>10);
    for(const point of crown){
      const ray=new Ray(point,new Vector3(point.x,0,point.z-.012).normalize());
      assert.ok(triangles.some(t=>ray.intersectTriangle(...t,false,new Vector3())),`${face} cranium protrudes through cropped hair at ${point.toArray()}`);
    }
  }
});

test('pants rise follows the front and rear hips without a downward crotch wedge',()=>{
  const {g,values}=model();let samples=0;
  for(const look of ['jeans','breeches','shorts','sports']){
    const node=g.nodes.find(n=>n.name==='look-bottom-'+look);
    for(const p of g.meshes[node.mesh].primitives){
      if(g.materials[p.material].name==='denim-pocket')continue;
      const pos=values(p.attributes.POSITION),normal=values(p.attributes.NORMAL);
      for(let i=0;i<pos.length;i++){
        const [x,y,z]=pos[i];if(Math.abs(x)<.075&&y>.80&&y<.87&&Math.abs(z)>.070){
          samples++;assert.ok(normal[i][1]>-.35,`${look} has a downward-facing crotch wedge at ${pos[i]}`);
        }
      }
    }
  }
  assert.ok(samples>20);
});

test('shoe outsoles have a broad flat contact patch rather than ellipsoid tips',()=>{
  const {g,values}=model();
  for(const look of ['sneakers','boots','flipflops','sandals']){
    const node=g.nodes.find(n=>n.name==='look-footwear-'+look);
    const sole=g.meshes[node.mesh].primitives.filter(p=>g.materials[p.material].name==='rubber-soles').flatMap(p=>values(p.attributes.POSITION));
    for(const side of [-1,1]){
      const bottom=sole.filter(v=>v[0]*side>0&&v[1]<.007);
      assert.ok(bottom.length>6,'sole needs an actual polygonal contact surface');
      assert.ok(Math.max(...bottom.map(v=>v[0]))-Math.min(...bottom.map(v=>v[0]))>.104,'sole footprint must span the shoe width');
      assert.ok(Math.max(...bottom.map(v=>v[2]))-Math.min(...bottom.map(v=>v[2]))>.24,'sole footprint must span heel to toe');
    }
  }
});

// Catches a missing export, rigid props, duplicate skeletons, or flat face cards.
test('every selectable look exports three-dimensional geometry on the shared skeleton',()=>{
  const {g,values}=model();
  const choices={hair:['crop','parted','bowl','lake','buzz','messy','longshag'],face:['oval','square','long'],beard:['stubble','short','full','goatee','chinstrap'],mustache:['pencil','classic','walrus','handlebar','horseshoe'],top:['tee','shirt','hoodie','sweater','tank','turtleneck'],bottom:['jeans','skinny','breeches','shorts','sports'],footwear:['sneakers','canvas','boots','flipflops','sandals']};
  const joints=g.skins[0].joints;
  for(const [category,options] of Object.entries(choices))for(const option of options){
    const prefix=`look-${category}-${option}`;
    const nodes=g.nodes.filter(n=>n.name===prefix||n.name?.startsWith(prefix+'-'));
    assert.ok(nodes.length,`missing ${prefix}`);
    for(const node of nodes){
      assert.notEqual(node.mesh,undefined,`${node.name} must be geometry`);
      assert.notEqual(node.skin,undefined,`${node.name} must deform`);
      assert.deepEqual(g.skins[node.skin].joints,joints,`${node.name} uses another skeleton`);
      for(const p of g.meshes[node.mesh].primitives){
        const positions=values(p.attributes.POSITION),weights=values(p.attributes.WEIGHTS_0);
        for(const row of weights)assert.ok(Math.abs(row.reduce((a,v)=>a+v,0)-1)<1e-5,`${node.name} unbound vertex`);
        for(let axis=0;axis<3;axis++){
          const coordinates=positions.map(v=>v[axis]);
          assert.ok(Math.max(...coordinates)-Math.min(...coordinates)>.001,`${node.name} is flat`);
        }
      }
    }
  }
  assert.equal(g.images?.length??0,0,'appearance is real geometry');
});

// Catches switching names/materials while reusing exactly the same silhouette.
test('hair, faces, clothes and shoes have distinct selectable geometry',()=>{
  const {g,values}=model();
  for(const category of ['hair','face','top','bottom','footwear']){
    const variants=new Map();
    for(const n of g.nodes){
      const match=n.name?.match(new RegExp(`^look-${category}-([^-]+)`));
      if(!match||n.mesh===undefined)continue;
      const positions=g.meshes[n.mesh].primitives.flatMap(p=>values(p.attributes.POSITION));
      variants.set(match[1],[...(variants.get(match[1])??[]),...positions]);
    }
    const signatures=[...variants.values()].map(p=>JSON.stringify(p));
    assert.equal(new Set(signatures).size,{hair:7,face:3,top:6,bottom:5,footwear:5}[category],`${category} must change geometry`);
  }
});

// Catches disconnected, raised sleeve caps instead of a sloping shoulder.
test('outer shoulders stay below the neck-to-shoulder slope',()=>{
  const {g,values}=model();
  for(const n of g.nodes.filter(n=>n.name==='neutral-skinned-body'||n.name?.startsWith('look-top-'))){
    const shoulder=g.meshes[n.mesh].primitives.flatMap(p=>values(p.attributes.POSITION)).filter(p=>Math.abs(p[0])>.16&&p[1]>1.38);
    assert.ok(shoulder.length,`${n.name} needs a shoulder`);
    assert.ok(Math.max(...shoulder.map(p=>p[1]))<1.425,`${n.name} has raised shoulder caps`);
  }
});

// Catches a cap wound inside-out, which exposes the head through its facets.
test('cropped hair has outward-facing crown normals',()=>{
  const {g,values}=model(),n=g.nodes.find(n=>n.name==='look-hair-crop');
  let crownVertices=0;
  for(const p of g.meshes[n.mesh].primitives){
    const positions=values(p.attributes.POSITION),normals=values(p.attributes.NORMAL);
    for(let i=0;i<positions.length;i++){
      const v=positions[i];
      if(v[1]<1.74)continue;
      crownVertices++;
      const outward=[v[0],v[1]-1.645,v[2]-.01];
      assert.ok(outward.reduce((sum,x,k)=>sum+x*normals[i][k],0)>0,'hair normals point into the head');
    }
  }
  assert.ok(crownVertices>20);
});

// Catches a short shuffling stride, crouched support, rigid feet or bad export.
test('exported walk takes grounded full steps with knee extension and heel-to-toe roll',()=>{
  const avatar=animatedModel('walk');
  const rig=JSON.parse(fs.readFileSync(new URL('../assets/apartment/v3/rig.json',import.meta.url),'utf8'));
  assert.ok(rig.walk?.strideDistance>=.85&&rig.walk.strideDistance<=1,'full walking stride, not rapid little shuffles');
  for(const side of ['L','R']){
    const offset=side==='L'?0:.5,angles=[],supportAngles=[],ankles=[],pitches=[],soleMin=[];
    for(let i=0;i<60;i++){
      avatar.frame(((i/60-offset+1)%1)*rig.walk.duration);
      const hip=avatar.position('thigh.'+side),knee=avatar.position('shin.'+side),ankle=avatar.position('foot.'+side),toe=avatar.position('toe.'+side);
      angles.push(kneeAngle(hip,knee,ankle));ankles.push(ankle);
      pitches.push(Math.atan2(toe.y-ankle.y,toe.z-ankle.z)*180/Math.PI);
      if(i>=6&&i<=27)supportAngles.push(angles.at(-1));
      if(i<36){
        const sole=avatar.vertices('look-footwear-sneakers').filter(v=>side==='L'?v.x>0:v.x<0);
        soleMin.push(Math.min(...sole.map(v=>v.y)));
      }
      assert.ok(Math.abs(hip.distanceTo(knee)-.405)<.002,'thigh length must not stretch');
      assert.ok(Math.abs(knee.distanceTo(ankle)-.410)<.002,'shin length must not stretch');
    }
    assert.ok(Math.min(...supportAngles)<9,`${side} support knee must straighten`);
    assert.ok(Math.max(...angles)<68,`${side} should walk without a deep crouch`);
    assert.ok(Math.max(...pitches)-Math.min(...pitches)>25,`${side} needs heel strike and toe-off`);
    assert.ok(Math.max(...ankles.map(v=>v.z))-Math.min(...ankles.map(v=>v.z))>.50,`${side} step must cover ground`);
    assert.ok(Math.min(...soleMin)>-.012,`${side} shoe penetrates ground`);
    assert.ok(Math.max(...soleMin)<.015,`${side} supporting shoe floats above ground`);
  }
  // During the flat support interval the foot stays in place as root advances.
  const anchors=[];
  for(const phase of [.16,.24,.32,.40]){
    avatar.frame(phase);anchors.push(avatar.position('foot.L').z+rig.walk.strideDistance*phase);
  }
  assert.ok(Math.max(...anchors)-Math.min(...anchors)<.006,'stance contact must match the distance-driven root');
});

// Catches a prone/supine pose or losing the axial twist during GLB export.
test('exported sleep lies on the side with the face toward the wall and head on pillow side',()=>{
  const avatar=animatedModel('sleep');avatar.frame(.5);
  avatar.root.rotation.y=Math.PI/2;avatar.root.position.set(1.84,.95,-.8);avatar.root.updateMatrixWorld(true);
  const head=avatar.position('head'),hip=avatar.position('pelvis');
  const shoulders=avatar.position('upper_arm.L').sub(avatar.position('upper_arm.R'));
  assert.ok(head.x<hip.x-.5,'head points toward negative world X / pillow');
  assert.ok(Math.abs(head.y-hip.y)<.13,'torso lies horizontally');
  assert.ok(Math.abs(shoulders.y)>.22&&Math.hypot(shoulders.x,shoulders.z)<.08,'tucked shoulders stack vertically in side sleep');
  const faceDirection=new Vector3(0,0,1).applyQuaternion(avatar.joint('head').getWorldQuaternion(avatar.root.quaternion.clone()));
  // Head bone local +Z is the original face direction in this exported skeleton.
  assert.ok(faceDirection.z<-.85&&Math.abs(faceDirection.y)<.2,'face must point to rear wall, away from viewer');
  const clothed=avatar.vertices('look-top-sweater');
  assert.ok(Math.min(...clothed.map(v=>v.y))>=.72,`lower arm rests forward on mattress instead of underneath shoulder: ${Math.min(...clothed.map(v=>v.y))}`);
  assert.ok(Math.max(...clothed.map(v=>v.y))<=1.20,`tucked arms must fit under a soft bed cover: ${Math.max(...clothed.map(v=>v.y))}`);
});

// Catches separately capped waist/leg tubes and a raised detached neck ring.
test('shorts form a single continuous waist and crotch, and raised sweater neck has no cap',()=>{
  const {g,values}=model();
  const shorts=g.nodes.find(n=>n.name==='look-bottom-shorts'),mesh=g.meshes[shorts.mesh];
  const adjacency=new Map(),key=v=>v.map(x=>Math.round(x*10000)).join(',');
  for(const p of mesh.primitives){
    const positions=values(p.attributes.POSITION),indices=values(p.indices).flat();
    for(let i=0;i<indices.length;i+=3){
      const triangle=indices.slice(i,i+3).map(j=>key(positions[j]));
      for(const a of triangle){if(!adjacency.has(a))adjacency.set(a,new Set());for(const b of triangle)adjacency.get(a).add(b);}
    }
  }
  let components=0;const unseen=new Set(adjacency.keys());
  while(unseen.size){components++;const queue=[unseen.values().next().value];unseen.delete(queue[0]);while(queue.length)for(const next of adjacency.get(queue.pop()))if(unseen.delete(next))queue.push(next);}
  assert.equal(components,1,'waist and both legs need a shared continuous crotch surface');
  const sweater=g.nodes.find(n=>n.name==='look-top-sweater');
  for(const p of g.meshes[sweater.mesh].primitives){
    const positions=values(p.attributes.POSITION),indices=values(p.indices).flat();
    assert.ok(Math.max(...positions.map(v=>v[1]))>1.50&&Math.max(...positions.map(v=>v[1]))<1.53,'thick sweater must cover neck below the chin');
    for(let i=0;i<indices.length;i+=3){
      const triangle=indices.slice(i,i+3).map(j=>positions[j]);
      assert.ok(!triangle.every(v=>v[1]>1.44)||Math.max(...triangle.map(v=>v[1]))-Math.min(...triangle.map(v=>v[1]))>.002,'neck opening cannot be a capped disc');
    }
  }
});

// Catches tan skin triangles protruding through the fitted hip/waist silhouette.
test('every bottom covers the skinned hips at rest and throughout the walk',()=>{
  const {g,values}=model(),body=g.nodes.find(n=>n.name==='neutral-skinned-body');
  const joints=g.skins[body.skin].joints.map(i=>g.nodes[i].name),covered=[];
  let offset=0;
  for(const p of g.meshes[body.mesh].primitives){
    const positions=values(p.attributes.POSITION),indices=values(p.attributes.JOINTS_0),weights=values(p.attributes.WEIGHTS_0);
    positions.forEach((v,i)=>{
      const hipWeight=weights[i].reduce((sum,w,k)=>sum+(/^(pelvis|thigh\.)/.test(joints[indices[i][k]])?w:0),0);
      if(v[1]>.70&&v[1]<.96&&hipWeight>.9)covered.push(offset+i);
    });offset+=positions.length;
  }
  assert.ok(covered.length>20,'exercise actual hip skin vertices');
  for(const clip of ['idle','walk']){
    const avatar=animatedModel(clip);
    for(const phase of clip==='idle'?[0]:Array.from({length:30},(_,i)=>i/30)){
      avatar.frame(phase);const skin=avatar.vertices('neutral-skinned-body');
      for(const bottom of ['jeans','breeches','shorts','sports']){
        const name='look-bottom-'+bottom,node=g.nodes.find(n=>n.name===name),fabric=avatar.vertices(name),triangles=[];
        let base=0;
        for(const p of g.meshes[node.mesh].primitives){
          const indices=values(p.indices).flat();
          for(let i=0;i<indices.length;i+=3)triangles.push(indices.slice(i,i+3).map(j=>fabric[base+j]));
          base+=values(p.attributes.POSITION).length;
        }
        for(const index of covered){
          const point=skin[index],ray=new Ray(point,new Vector3(point.x>=0?1:-1,0,0));
          assert.ok(triangles.some(t=>ray.intersectTriangle(...t,false,new Vector3())),`${bottom} exposes hip skin at ${clip} ${phase}, ${point.toArray().map(v=>v.toFixed(3))}`);
        }
      }
    }
  }
});

// Catches the old pulling gesture when the entry door opens away from the actor.
test('open-door hand pushes forward into the opening and holds after extension',()=>{
  const avatar=animatedModel('open-door');
  const reach=[];
  for(const t of [.2,1.2,1.8]){
    avatar.frame(t);reach.push(avatar.position('hand.R').z-avatar.position('upper_arm.R').z);
  }
  assert.ok(reach[1]>reach[0]+.16,'pushing must extend the wrist forward, not pull it inward');
  assert.ok(Math.abs(reach[2]-reach[1])<.015,'hand holds the open door until the exit begins');
});

// Catches the prior idle animation that moved the entire body, including the feet.
test('idle breathes through upper body while leaving the pelvis planted',()=>{
  const {g,values}=model(),idle=g.animations.find(a=>a.name==='idle');
  const tracks=idle.channels.map(c=>({name:g.nodes[c.target.node].name,path:c.target.path,frames:values(idle.samplers[c.sampler].output)}));
  const span=t=>Math.max(...t.frames[0].map((_,i)=>Math.max(...t.frames.map(v=>v[i]))-Math.min(...t.frames.map(v=>v[i]))));
  const root=tracks.filter(t=>t.name==='pelvis');
  assert.ok(root.length);
  assert.ok(root.every(t=>span(t)<.00001),'idle should not bounce the root and slide feet');
  assert.ok(tracks.some(t=>['chest','neck','upper_arm.L','upper_arm.R'].includes(t.name)&&span(t)>.0005),'idle needs subtle breathing or shoulder motion');
});
