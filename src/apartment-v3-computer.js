import {PC_IDENTITY} from './pc-identity.js?rev=40';
// Owns only its camera, canvas texture and cloned materials; authored meshes stay owned by the scene.
export function createComputerView({THREE,screen,indicator,viewport}){
 if(!screen?.geometry||!indicator)throw Error('Missing live CRT surfaces');
 const camera=new THREE.PerspectiveCamera(48,viewport.width/viewport.height,.001,100);
 const original=[screen.material,indicator.material],canvas=globalThis.document?.createElement('canvas');
 if(canvas){canvas.width=768;canvas.height=520;}
 const context=canvas?.getContext('2d'),texture=canvas?new THREE.CanvasTexture(canvas):null;
 if(texture){texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;}
 screen.material=new THREE.MeshBasicMaterial({map:texture,color:0xffffff,toneMapped:false});
 indicator.material=new THREE.MeshBasicMaterial({color:0x171a10,toneMapped:false});
 const startPosition=new THREE.Vector3(),startRotation=new THREE.Quaternion();
 let active=false,zoom=0,startFov=48,lastKey='',disposed=false;
 function geometry(){
  screen.updateWorldMatrix(true,false);screen.geometry.computeBoundingBox();
  const box=screen.geometry.boundingBox,center=box.getCenter(new THREE.Vector3()).applyMatrix4(screen.matrixWorld),scale=screen.getWorldScale(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).multiply(scale);
  const normal=new THREE.Vector3(0,0,1).transformDirection(screen.matrixWorld),up=new THREE.Vector3(0,1,0).transformDirection(screen.matrixWorld);
  return {center,normal,up,width:size.x,height:size.y};
 }
 function frame(){
  if(!active)return;
  const g=geometry(),t=zoom*zoom*(3-2*zoom),tan=Math.tan(48*Math.PI/360);
  camera.fov=THREE.MathUtils.lerp(startFov,48,t);
  const distance=Math.min(g.height/(2*tan),g.width/(2*tan*camera.aspect))*.94;
  const end=g.center.clone().addScaledVector(g.normal,distance),look=new THREE.Matrix4().lookAt(end,g.center,g.up),q=new THREE.Quaternion().setFromRotationMatrix(look);
  camera.position.lerpVectors(startPosition,end,t);camera.quaternion.slerpQuaternions(startRotation,q,t);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
 }
 function draw(p){
  const key=JSON.stringify({...p,progress:Math.floor((p.progress??0)*30)/30});if(key===lastKey)return;lastKey=key;
  screen.material.color.setScalar(p.brightness===0?.018:Math.max(0,p.brightness));indicator.material.color.set(p.brightness>0?0x75bf43:0x171a10);
  if(!context)return;
  const c=context;c.fillStyle=p.screen==='off'?'#101818':p.screen==='bios'||p.screen==='loading'?'#050709':'#394e58';c.fillRect(0,0,768,520);
  if(p.screen==='desktop'){
   c.fillStyle='#70a490';c.fillRect(0,0,768,490);c.fillStyle='#354b57';c.fillRect(0,490,768,30);c.fillStyle='#c89544';c.fillRect(0,490,95,30);
   c.font='17px Tahoma';c.fillStyle='white';c.fillText(PC_IDENTITY.menuLabel,20,512);
   for(const [i,label] of ['Мой компьютер','Underweb','FT Studio'].entries()){c.fillStyle='#d7e6ec';c.fillRect(30,28+i*98,30,27);c.fillStyle='white';c.fillText(label,12,78+i*98);}
  }else if(p.screen!=='off'){
   c.textAlign='center';c.fillStyle='white';c.font=(p.screen==='bios'?'24px monospace':'bold 48px Tahoma');c.fillText(p.title,384,230);c.font='21px Tahoma';c.fillText(p.subtitle,384,278);
   if(p.screen==='loading'){c.strokeStyle='#5a6680';c.strokeRect(274,326,220,18);c.fillStyle='#d5a555';c.fillRect(277+((p.progress??0)*165),329,48,12);}c.textAlign='left';
  }
  texture.needsUpdate=true;
 }
 return {camera,get active(){return active;},begin(source){
  if(disposed)return;source.updateMatrixWorld();startPosition.copy(source.position);startRotation.copy(source.quaternion);startFov=source.isPerspectiveCamera?source.fov:48;
  if(source.isOrthographicCamera){const g=geometry(),forward=new THREE.Vector3(0,0,-1).applyQuaternion(source.quaternion),depth=g.center.clone().sub(source.position).dot(forward),height=(source.top-source.bottom)/source.zoom;startPosition.addScaledVector(forward,depth-height/(2*Math.tan(startFov*Math.PI/360)));}
  active=true;zoom=0;frame();
 },update(snapshot,presentation){if(disposed)return;zoom=THREE.MathUtils.clamp(snapshot.zoom??0,0,1);frame();draw(presentation);},resize(width,height){camera.aspect=Math.max(1,width)/Math.max(1,height);frame();},end(){active=false;},dispose(){if(disposed)return;disposed=true;active=false;screen.material.dispose();indicator.material.dispose();texture?.dispose();screen.material=original[0];indicator.material=original[1];}};
}
