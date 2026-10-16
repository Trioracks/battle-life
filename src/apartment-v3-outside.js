// Window art uses the same daylight authority as the baked cutaway views.
export function createOutsideLighting(root){
 const materialsOf=object=>{const result=[];object?.traverse(o=>{if(o.material)result.push(...(Array.isArray(o.material)?o.material:[o.material]));});return result;};
 const windows=root.getObjectByName('static-outside-window-lights');
 const windowMaterials=materialsOf(windows);
 for(const material of windowMaterials){material.transparent=true;material.depthWrite=false;}
 const surfaces=[['static-dusty-blue-night-glass',[.17,.20,.245]],['static-distant-panel-buildings',[.19,.24,.43]]].map(([name,night])=>({night,materials:materialsOf(root.getObjectByName(name))}));
 return daylight=>{
  if(windows)windows.visible=daylight<.999;
  for(const material of windowMaterials)material.opacity=1-daylight;
  for(const {night,materials} of surfaces)for(const material of materials)material.color.setRGB(...night.map(v=>v+(1-v)*daylight));
 };
}

// Outdoor meshes are self-lit by the shared day value, not the apartment lamps.
export function createCourtyardLighting(THREE,root){
 const surfaces=[],windows=[];
 root.traverse(o=>{
  if(!o.isMesh)return;
  const isWindow=o.name.includes('exterior-window-lights');
  const source=Array.isArray(o.material)?o.material:[o.material];
  const materials=source.map(m=>new THREE.MeshBasicMaterial({color:m.color.clone(),map:m.map,transparent:isWindow,depthWrite:!isWindow}));
  o.material=materials.length===1?materials[0]:materials;
  for(const mat of materials)surfaces.push({mat,base:mat.color.clone(),isWindow});
  if(isWindow)windows.push(o);
 });
 return daylight=>{
  for(const {mat,base,isWindow} of surfaces){mat.color.copy(base).multiplyScalar(isWindow?1.3:.20+.80*daylight);if(isWindow)mat.opacity=1-daylight;}
  for(const o of windows)o.visible=daylight<.999;
 };
}
