import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Object3D,Vector3,BufferGeometry,Float32BufferAttribute,Mesh,MeshBasicMaterial,DoubleSide,Raycaster} from '../vendor/three/three.module.js';
import {readGlb} from './helpers/glb-pose.js';
import {assetPath} from './helpers/apartment-assets.js';

function triangles(file){
 const {json:g,values}=readGlb(file),nodes=g.nodes.map(n=>{const o=new Object3D();if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
 g.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));
 return g.nodes.flatMap((n,i)=>{if(n.mesh===undefined)return [];nodes[i].updateWorldMatrix(true,false);return g.meshes[n.mesh].primitives.map(p=>{
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(values(p.attributes.POSITION).flat(),3));if(p.indices!==undefined)geometry.setIndex(values(p.indices).flat());
  const mesh=new Mesh(geometry,new MeshBasicMaterial({side:DoubleSide}));mesh.matrixAutoUpdate=false;mesh.matrix.copy(nodes[i].matrixWorld);mesh.updateMatrixWorld(true);return mesh;
 });});
}
test('three actual window openings admit rays while adjacent walls and smoke masks block them',()=>{
 const c=JSON.parse(fs.readFileSync(assetPath('scene.json'))),inside=triangles(c.staticGeometry),mask=triangles(c.exterior.occluders);
 for(const w of c.layout.windows){
  const eye=new Vector3(w.center[0]+.25,w.center[1]+.32,-1.2),direction=new Vector3(0,0,-1);
  assert.equal(new Raycaster(eye,direction,.01,1.2).intersectObjects(inside).length,0,w.id+' must not contain fake glass or opaque wall');
  assert.equal(new Raycaster(eye,direction,.01,1.2).intersectObjects(mask).length,0,w.id+' smoke mask must have a real opening');
  eye.x=w.center[0]+w.width/2+.25;
  assert.ok(new Raycaster(eye,direction,.01,1.2).intersectObjects(inside).length,w.id+' neighboring wall');
  assert.ok(new Raycaster(eye,direction,.01,1.2).intersectObjects(mask).length,w.id+' neighboring smoke mask');
 }
 for(const o of [...inside,...mask]){o.geometry.dispose();o.material.dispose();}
});
