import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Object3D,Vector3,BufferGeometry,Float32BufferAttribute,Mesh,MeshBasicMaterial,DoubleSide,Raycaster} from '../vendor/three/three.module.js';
import {readGlb} from './helpers/glb-pose.js';
import {assetPath} from './helpers/apartment-assets.js';
const config=()=>JSON.parse(fs.readFileSync(assetPath('scene.json'),'utf8'));
test('side view contains eight distinct exported lighting images',()=>{
 const c=config();for(const [mode,yaw] of [['2D',0]]){
  const v=c.cameraViews[mode];assert.equal(v.yaw,yaw);assert.equal(v.pitch,8);
  for(const files of Object.values(v.lightingStates))for(const file of Object.values(files))assert.ok(fs.statSync(assetPath(file)).size>100000,file);
 }
 assert.equal(new Set(Object.values(c.cameraViews['2D'].lightingStates).flatMap(Object.values)).size,8);
});
test('exported textured apartment encloses first-person eyes through full rotation, floor and ceiling',()=>{
 const meshes=[],material=new MeshBasicMaterial({side:DoubleSide});
 for(const file of ['static.glb','interaction.glb',...(config().exterior?['exterior.glb']:[])]){
  const {json:g,values}=readGlb(file),nodes=g.nodes.map(n=>{const o=new Object3D();if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
  g.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));
  g.nodes.forEach((n,i)=>{if(n.mesh===undefined||n.name?.startsWith('depth-'))return;nodes[i].updateWorldMatrix(true,false);
   for(const p of g.meshes[n.mesh].primitives){const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(values(p.attributes.POSITION).flat(),3));if(p.indices!==undefined)geometry.setIndex(values(p.indices).flat());const mesh=new Mesh(geometry,material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(nodes[i].matrixWorld);mesh.updateMatrixWorld(true);meshes.push(mesh);}
  });
 }
 for(const x of [-3.25,3.4]){
  const directions=[new Vector3(0,1,0),new Vector3(0,-1,0),...Array.from({length:24},(_,i)=>new Vector3(Math.sin(i*Math.PI/12),0,Math.cos(i*Math.PI/12)))];
  for(const direction of directions){const hit=new Raycaster(new Vector3(x,1.63,.85),direction,.03,200).intersectObjects(meshes)[0];assert.ok(hit,`shell hole from ${x} toward ${direction.toArray()}`);}
 }
});
test('first-person static export contains textured geometry and excludes all dynamic names',()=>{
 const c=config(),b=fs.readFileSync(assetPath(c.staticGeometry)),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
 assert.ok(g.meshes.length>10);assert.ok(g.images.length>10);
 const outside=c.exterior?readGlb(c.exterior.geometry).json:g;
 assert.ok(outside.nodes.some(n=>n.name.includes('exterior-window-lights')||n.name==='static-outside-window-lights'),'outside lit windows have independent daylight visibility');
 assert.ok(g.nodes.every(n=>!/^hinge-|^chair-|^clock-|^switch-|^sleep-blanket$|^bed-cover$|^depth-/.test(n.name??'')));
 assert.ok(g.materials.filter(m=>m.pbrMetallicRoughness?.baseColorTexture).length>10);
 const nodes=g.nodes.map(n=>{const o=new Object3D();if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
 g.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));
 const points=g.nodes.flatMap((n,i)=>{nodes[i].updateWorldMatrix(true,false);return n.mesh===undefined?[]:g.meshes[n.mesh].primitives.flatMap(p=>{const a=g.accessors[p.attributes.POSITION];return [a.min,a.max].map(v=>new Vector3(...v).applyMatrix4(nodes[i].matrixWorld));});});
 assert.ok(points.some(p=>p.y>3&&p.z>1.7),'closed shell reaches ceiling and front');
});
