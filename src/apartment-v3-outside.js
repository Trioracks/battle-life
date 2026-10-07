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
