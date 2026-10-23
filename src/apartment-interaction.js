// The baked room combines furniture by material. These tight authored regions
// recover its actual triangles; they are never displayed or picked as boxes.
const FURNITURE_REGIONS={
  bed:[[.66,.08,-1.41],[2.83,1.25,-.14]],
  computer:[[3.73,-.001,-1.31],[5.68,1.6,-.44]],
  dining:[[-7.81,-.001,-1.3],[-6.69,1.06,.23]],
  sink:[[-6.04,-.001,-1.48],[-3.8,1.45,-.39]],
  stove:[[-3.74,-.001,-1.46],[-2.73,1.3,-.55]],
  fridge:[[-1.72,-.001,-1.52],[-.8,1.83,-.48]],
};
const LIVE_ROOTS={
  bed:['bed-cover','sleep-blanket'],computer:['chair-root','crt-glass','crt-power-led'],
  fridge:['hinge-fridge'],passage:['hinge-passage'],entry:['hinge-entry'],
  'light-living':['switch-living-root'],'light-kitchen':['switch-kitchen-root'],wardrobe:['home-wardrobe'],
};
export function visibleInScene(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}

function connectedParts(positions,index,matrix){
  const world=positions.clone().applyMatrix4(matrix),parents=Array.from({length:positions.count},(_,i)=>i),welded=new Map();
  const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
  const join=(a,b)=>{parents[find(b)]=find(a);};
  // Atlas UV seams split vertices. Weld their positions before finding complete
  // components, so a region cannot accidentally select one face of a wall sill.
  for(let i=0;i<positions.count;i++){
    const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>Math.round(v*100000)).join(',');
    if(welded.has(key))join(welded.get(key),i);else welded.set(key,i);
  }
  const count=index?.count??positions.count,vertex=i=>index?index.getX(i):i;
  for(let i=0;i<count;i+=3){join(vertex(i),vertex(i+1));join(vertex(i),vertex(i+2));}
  const parts=new Map();
  for(let i=0;i<count;i++){
    const v=vertex(i),root=find(v);
    if(!parts.has(root))parts.set(root,{vertices:[],min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
    const part=parts.get(root),point=[world.getX(v),world.getY(v),world.getZ(v)];part.vertices.push(v);
    for(let axis=0;axis<3;axis++){part.min[axis]=Math.min(part.min[axis],point[axis]);part.max[axis]=Math.max(part.max[axis],point[axis]);}
  }
  return [...parts.values()];
}

export function createInteractionTargets(THREE,{staticScene,liveScene,config,actor}){
  const material=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,toneMapped:false});
  const byAction=new Map(),copies=[],owned=[];
  const add=(id,source,geometry=source.geometry)=>{
    const mesh=source.isSkinnedMesh?source.clone(false):new THREE.Mesh(geometry,material);
    mesh.geometry=geometry;mesh.material=material;mesh.matrixAutoUpdate=false;
    mesh.userData={action:id};mesh.frustumCulled=false;
    if(!byAction.has(id))byAction.set(id,[]);byAction.get(id).push(mesh);copies.push({mesh,source});
  };
  staticScene.updateMatrixWorld(true);liveScene.updateMatrixWorld(true);
  staticScene.traverse(source=>{
    if(!source.isMesh)return;
    const positions=source.geometry.getAttribute('position'),index=source.geometry.index;
    const parts=connectedParts(positions,index,source.matrixWorld);
    for(const [id,[min,max]] of Object.entries(FURNITURE_REGIONS)){
      if(!config.actions[id])continue;
      const chosen=parts.filter(part=>min.every((v,i)=>part.min[i]>=v&&part.max[i]<=max[i])).flatMap(part=>part.vertices);
      if(!chosen.length)continue;
      const geometry=new THREE.BufferGeometry();
      // Preserve the source's local coordinates and transforms exactly, so the
      // mask's depth agrees with the original baked triangles.
      const vertices=new Float32Array(chosen.length*3);
      chosen.forEach((vertex,i)=>{vertices[i*3]=positions.getX(vertex);vertices[i*3+1]=positions.getY(vertex);vertices[i*3+2]=positions.getZ(vertex);});
      geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));owned.push(geometry);add(id,source,geometry);
    }
  });
  for(const [id,names] of Object.entries(LIVE_ROOTS)){
    if(!config.actions[id])continue;
    for(const name of names)liveScene.getObjectByName(name)?.traverse(source=>{if(source.isMesh)add(id,source);});
  }
  actor?.traverse(source=>{if(source.isMesh)add('hero',source);});
  // An open doorway remains a navigation target even after its leaf moves.
  const passage=config.actions.passage?.hit;
  const portal=passage?new THREE.Mesh(new THREE.BoxGeometry(...passage[1]),material):null;
  if(portal){portal.position.fromArray(passage[0]);portal.updateMatrixWorld(true);}
  function sync(){for(const {mesh,source} of copies){mesh.visible=visibleInScene(source);mesh.matrix.copy(source.matrixWorld);mesh.updateMatrixWorld(true);}}
  sync();
  return {
    sync,portal,material,
    objects:id=>byAction.get(id)??[],
    all:()=>copies.map(({mesh})=>mesh).filter(mesh=>mesh.visible),
    dispose(){for(const geometry of owned)geometry.dispose();portal?.geometry.dispose();material.dispose();},
  };
}

export function pickInteraction(ray,targets,blockers){
  targets.sync();
  const surface=ray.intersectObjects(blockers.filter(Boolean),true).find(hit=>visibleInScene(hit.object));
  const hit=ray.intersectObjects(targets.all(),false)[0],distance=surface?.distance??Infinity;
  // Exact surface geometry only needs a floating-point tolerance, not the old
  // 2.5 cm allowance that could accept a hit behind a thin occluding surface.
  if(hit&&hit.distance<=distance+.0001)return hit.object.userData.action==='hero'?{hero:true,surface}:{id:hit.object.userData.action,surface};
  const portal=targets.portal&&ray.intersectObject(targets.portal)[0];
  if(portal&&portal.distance<=distance+.0001)return {id:'passage',surface};
  return {surface};
}

export function canClickApartment({mode,pcPhase,pcEntering=false,modalOpen=false,actionMenuOpen=false,cameraFade=false,hidden=false}){
  // Loading the computer while walking must not swallow a floor-click cancel.
  // Once seating begins, the PC transition owns input until the room returns.
  const roomInput=pcPhase==='room'||pcPhase==='preparing'&&!pcEntering;
  return mode==='game'&&!modalOpen&&!actionMenuOpen&&!cameraFade&&!hidden&&roomInput;
}

export function createApartmentHover({pick,select,present}){
  let pointer=null,dirty=false,lastPick=-Infinity;
  const clear=()=>{pointer=null;select(null);present({});};
  return {
    move(event){pointer={clientX:event.clientX,clientY:event.clientY};dirty=true;},
    clear,
    update(allowed,now=performance.now()){
      if(!allowed){clear();return;}
      if(!pointer)return;
      if(!dirty&&now-lastPick<80)return;
      dirty=false;lastPick=now;
      const hit=pick(pointer);select(hit.id??(hit.hero?'hero':null));present(hit);
    },
  };
}
