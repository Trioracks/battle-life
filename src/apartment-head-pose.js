import {Quaternion,Vector3} from '../vendor/three/three.module.js';
// The avatar faces local +Z; a Three camera faces local -Z.
const cameraFacing=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI);
export function headCameraPose({position,quaternion,eyeOffset=[0,.09,.1]}){
 const rotation=new Quaternion(...quaternion).normalize();
 const eye=new Vector3(...eyeOffset).applyQuaternion(rotation).add(new Vector3(...position));
 return {position:eye.toArray(),quaternion:rotation.multiply(cameraFacing).toArray(),fov:60,near:.03};
}
