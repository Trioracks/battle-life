import test from 'node:test';
import assert from 'node:assert/strict';
import {readGlb,posedRig} from './helpers/glb-pose.js';
import {Vector3,Ray,Triangle} from '../vendor/three/three.module.js';
const {json:g,values}=readGlb('mannequin.glb'),skin=g.nodes.find(n=>n.name==='neutral-skinned-body'),samples=[];let skinOffset=0;
for(const p of g.meshes[skin.mesh].primitives){const positions=values(p.attributes.POSITION),indices=values(p.indices).flat();for(let i=0;i<indices.length;i+=3){const ids=indices.slice(i,i+3),normal=new Triangle(...ids.map(id=>new Vector3(...positions[id]))).getNormal(new Vector3());if(normal.y<=.15)continue;for(let a=0;a<=4;a++)for(let b=0;b<=4-a;b++){const weights=[a/4,b/4,1-(a+b)/4],point=ids.reduce((p,j,k)=>p.addScaledVector(new Vector3(...positions[j]),weights[k]),new Vector3());if(Math.abs(point.x)>.13&&Math.abs(point.x)<.30&&point.y>1.37&&point.y<1.445)samples.push({ids:ids.map(j=>j+skinOffset),weights});}}skinOffset+=positions.length;}
for(const look of ['tee','shirt','hoodie','sweater'])test(`${look} covers actual shoulder triangle interiors while sitting, typing base and walking`,()=>{
 assert.ok(samples.length>10);const node=g.nodes.find(n=>n.name==='look-top-'+look),polygons=[];let offset=0;for(const p of g.meshes[node.mesh].primitives){const indices=values(p.indices).flat();for(let i=0;i<indices.length;i+=3)polygons.push(indices.slice(i,i+3).map(id=>id+offset));offset+=values(p.attributes.POSITION).length;}
 const misses=[];for(const clip of ['idle','seated','walk']){const rig=posedRig(clip);for(const at of [0,.15,.4,.8]){rig.jointPositions(at);const skinPoints=rig.vertices('neutral-skinned-body'),cloth=rig.vertices('look-top-'+look),triangles=polygons.map(ids=>ids.map(id=>cloth[id]));for(const {ids,weights} of samples){const points=ids.map(id=>skinPoints[id]),point=points.reduce((p,v,i)=>p.addScaledVector(v,weights[i]),new Vector3()),normal=new Triangle(...points).getNormal(new Vector3()),ray=new Ray(point,normal);if(!triangles.some(t=>{const hit=ray.intersectTriangle(...t,false,new Vector3());return hit&&hit.distanceTo(point)<.06;}))misses.push({clip,at,point:point.toArray()});}}}
 assert.equal(misses.length,0,JSON.stringify({look,count:misses.length,first:misses.slice(0,3)}));
});
// Densely sample the clavicle strip, including the triangle interiors that are
// visible as tan wedges in the seated portrait. Exclude the actual neck hole.
for(const look of ['tee','shirt','hoodie','sweater'])test(`${look} covers the clavicle strip outside the intentional neckline in every pose`,()=>{
 const samples=[];let base=0;for(const p of g.meshes[skin.mesh].primitives){const vv=values(p.attributes.POSITION),ii=values(p.indices).flat();for(let i=0;i<ii.length;i+=3)for(let a=0;a<=4;a++)for(let b=0;b<=4-a;b++){const weights=[a/4,b/4,1-(a+b)/4],ids=ii.slice(i,i+3),v=[0,1,2].map(axis=>ids.reduce((sum,j,k)=>sum+vv[j][axis]*weights[k],0));if(v[1]>1.415&&v[1]<1.449&&Math.hypot(v[0],v[2])>.07&&Math.abs(v[0])<.18)samples.push({ids:ids.map(j=>base+j),weights});}base+=vv.length;}
 assert.ok(samples.length>100);const node=g.nodes.find(n=>n.name==='look-top-'+look),polygons=[];let offset=0;for(const p of g.meshes[node.mesh].primitives){const ii=values(p.indices).flat();for(let i=0;i<ii.length;i+=3)polygons.push(ii.slice(i,i+3).map(j=>j+offset));offset+=values(p.attributes.POSITION).length;}
 const misses=[];for(const clip of ['idle','walk','seated']){const rig=posedRig(clip);for(const at of [0,.2,.5,.8]){rig.jointPositions(at);const body=rig.vertices('neutral-skinned-body'),cloth=rig.vertices('look-top-'+look),triangles=polygons.map(ids=>ids.map(j=>cloth[j]));for(const {ids,weights} of samples){const point=ids.reduce((p,j,k)=>p.addScaledVector(body[j],weights[k]),new Vector3()),ray=new Ray(point,new Vector3(point.x,.08,point.z).normalize());if(!triangles.some(t=>ray.intersectTriangle(...t,false,new Vector3())))misses.push({clip,at,point:point.toArray()});}}}
 assert.equal(misses.length,0,JSON.stringify({look,count:misses.length,first:misses.slice(0,2)}));
});
test('closed garments mask only covered deltoid skin while a tank retains both original bare shoulders',()=>{
 const body=g.meshes[skin.mesh].primitives.flatMap(p=>values(p.attributes.POSITION));assert.equal(body.filter(v=>Math.abs(v[0])>.205&&v[1]>1.35&&v[1]<1.41).length,0);
 const tank=g.nodes.find(n=>n.name==='look-top-tank'),bare=g.meshes[tank.mesh].primitives.filter(p=>g.materials[p.material].name==='warm-skin').flatMap(p=>values(p.attributes.POSITION));for(const side of [-1,1])assert.ok(bare.filter(v=>v[0]*side>.205&&v[1]>1.35&&v[1]<1.41).length>10);
 for(const look of ['tee','shirt','hoodie','sweater'])assert.ok(g.meshes[g.nodes.find(n=>n.name==='look-top-'+look).mesh].primitives.every(p=>g.materials[p.material].name!=='warm-skin'));
});
