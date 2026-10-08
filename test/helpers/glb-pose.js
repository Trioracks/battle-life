import {assetPath} from './apartment-assets.js';
import fs from 'node:fs';
import {Object3D,AnimationMixer,AnimationClip,VectorKeyframeTrack,QuaternionKeyframeTrack,Vector3,Matrix4} from '../../vendor/three/three.module.js';
export function readGlb(name){
  const b=fs.readFileSync(assetPath(name));
  const length=b.readUInt32LE(12),json=JSON.parse(b.subarray(20,20+length)),bin=b.subarray(28+length);
  const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
  const values=index=>{const a=json.accessors[index],view=json.bufferViews[a.bufferView],width=widths[a.type];
    const bytes={5121:1,5123:2,5125:4,5126:4}[a.componentType],read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];
    return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,j)=>bin[read]((view.byteOffset??0)+(a.byteOffset??0)+i*(view.byteStride??bytes*width)+j*bytes)));
  };return {json,values};
}
export function posedRig(clip){
  const {json:g,values}=readGlb('mannequin.glb'),root=new Object3D();
  const nodes=g.nodes.map(n=>{const o=new Object3D();o.name=n.name;if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
  g.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));g.scenes[g.scene??0].nodes.forEach(i=>root.add(nodes[i]));
  const a=g.animations.find(a=>a.name===clip),tracks=a.channels.map(c=>{const s=a.samplers[c.sampler],T=c.target.path==='rotation'?QuaternionKeyframeTrack:VectorKeyframeTrack;return new T(nodes[c.target.node].uuid+'.'+{translation:'position',rotation:'quaternion',scale:'scale'}[c.target.path],values(s.input).flat(),values(s.output).flat());});
  const mixer=new AnimationMixer(root);mixer.clipAction(new AnimationClip(clip,-1,tracks)).play();mixer.setTime(0);root.updateMatrixWorld(true);
  return {vertices(name){const n=g.nodes.find(n=>n.name===name),skin=g.skins[n.skin],inverse=values(skin.inverseBindMatrices).map(v=>new Matrix4().fromArray(v));
    return g.meshes[n.mesh].primitives.flatMap(p=>{const pos=values(p.attributes.POSITION),weights=values(p.attributes.WEIGHTS_0),joints=values(p.attributes.JOINTS_0);return pos.map((v,k)=>{const result=new Vector3();for(let j=0;j<4;j++)if(weights[k][j])result.addScaledVector(new Vector3().fromArray(v).applyMatrix4(new Matrix4().multiplyMatrices(nodes[skin.joints[joints[k][j]]].matrixWorld,inverse[joints[k][j]])),weights[k][j]);return result;});});
  }};
}
