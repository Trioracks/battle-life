// Analytic positions: no accumulating particles or timers, pause is exact.
export function createSmoke(THREE,exterior){
 const root=new THREE.Group();root.name='factory-smoke';
 const geometry=new THREE.IcosahedronGeometry(1,0),dummy=new THREE.Object3D(),meshes=[];
 for(const emitter of exterior.emitters??[]){
  const material=new THREE.MeshBasicMaterial({color:0x666967,transparent:true,opacity:.31,depthWrite:false});
  const mesh=new THREE.InstancedMesh(geometry,material,18);mesh.name=emitter.id+'-smoke';mesh.frustumCulled=false;root.add(mesh);meshes.push({mesh,emitter});
 }
 const noise=(seed,i)=>{const x=Math.sin(seed*17.17+i*127.1)*43758.5453;return x-Math.floor(x);};
 function update(elapsedSeconds,daylight){
  const seconds=Number.isFinite(elapsedSeconds)?Math.max(0,elapsedSeconds):0,day=Math.max(0,Math.min(1,daylight));
  for(const {mesh,emitter} of meshes){
   mesh.material.color.setRGB(.10+.31*day,.115+.32*day,.14+.29*day);
   for(let i=0;i<18;i++){
    const age=((seconds+noise(emitter.seed,i)*24)%24)/24,spread=.3+age*1.7;
    dummy.position.set(emitter.position[0]+age*8+(noise(emitter.seed,i+30)-.5)*spread,emitter.position[1]+age*9,emitter.position[2]+age*2+(noise(emitter.seed,i+60)-.5)*spread);
    dummy.rotation.set(i*.47,age*.7+i,age*.3);const size=.45+age*1.9;dummy.scale.set(size,size*.75,size*.9);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;
  }
 }
 function dispose(){geometry.dispose();for(const {mesh} of meshes)mesh.material.dispose();root.clear();}
 update(0,0);return {root,update,dispose};
}
