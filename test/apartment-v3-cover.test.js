import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Ray} from '../vendor/three/three.module.js';
import {readGlb,posedRig} from './helpers/glb-pose.js';
test('the real sleeping cover stays above the skinned legs and clothing, including shoes',()=>{
  const {json:g,values}=readGlb('interaction.glb');
  const node=g.nodes.find(n=>n.name==='sleep-blanket'),primitive=g.meshes[node.mesh].primitives[0];
  const positions=values(primitive.attributes.POSITION).map(v=>new Vector3(...v)),indices=values(primitive.indices).flat();
  const rig=posedRig('sleep'),ray=new Ray(),hit=new Vector3(),down=new Vector3(0,-1,0);
  let checked=0,worst=0,where='';
  const names=readGlb('mannequin.glb').json.nodes.filter(n=>n.mesh!==undefined&&n.skin!==undefined&&(n.name==='neutral-skinned-body'||/^look-(top|bottom|footwear)-/.test(n.name))).map(n=>n.name);
  for(const name of names){
    for(const p of rig.vertices(name)){
      const world=new Vector3(p.z+1.84,p.y+.95,-p.x-.8);
      if(world.x<1.33||world.x>2.81||world.y<.8)continue;
      ray.set(world.clone().add(new Vector3(0,2,0)),down);let top=-Infinity;
      for(let i=0;i<indices.length;i+=3)if(ray.intersectTriangle(positions[indices[i]],positions[indices[i+1]],positions[indices[i+2]],false,hit))top=Math.max(top,hit.y);
      const gap=world.y-top;if(gap>worst){worst=gap;where=name+' '+world.toArray().map(n=>n.toFixed(3)).join(',');}checked++;
    }
  }
  assert.ok(checked>100);assert.ok(worst<.002,`body pierces cover by ${worst.toFixed(3)}m at ${where}`);
});
