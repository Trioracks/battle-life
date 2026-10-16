// The live switches share the baked apartment's source materials. Own only the
// replacements, so styling and cleanup never alter those shared resources.
const styles=new WeakMap();
export function applySwitchStyle(THREE,root){
  if(styles.has(root))return styles.get(root);
  const materials={},originals=new Map();
  const finishes={
    backplate:{color:0xc9c0a2,roughness:.76},
    rocker:{color:0xd4cab0,roughness:.70},
    recess:{color:0x8f8470,roughness:.88},
    screw:{color:0x9b9382,roughness:.64,metalness:.25},
  };
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    // GLTFLoader sanitizes Blender's second screw suffix from .001 to _001.
    const part=mesh.name.match(/^switch-(?:living|kitchen)-(backplate|rocker|recess|screw(?:[._]001)?)$/)?.[1]?.replace(/[._]001$/,'');
    if(!part)return;
    materials[part]??=new THREE.MeshStandardMaterial(finishes[part]);
    materials[part].name='home-switch-'+part;
    originals.set(mesh,mesh.material);mesh.material=materials[part];
  });
  let disposed=false;
  const style={dispose(){
    if(disposed)return;disposed=true;
    for(const [mesh,original] of originals)mesh.material=original;
    for(const material of Object.values(materials))material.dispose();
    originals.clear();styles.delete(root);
  }};
  styles.set(root,style);return style;
}
